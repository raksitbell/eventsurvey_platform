/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node tests load TypeScript through the local harness. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadSource } = require("./support/load-source.cjs");

function matrix(partial) {
  return {
    event: "view_only",
    registrationForm: "view_only",
    surveyForm: "view_only",
    dashboard: "view_only",
    canViewSubmissions: false,
    canManageSubmissions: false,
    canExport: false,
    ...partial,
  };
}

function fixture({
  description = null,
  permissions = [],
  eventStatus = "open",
  eventId = "event",
  otherEventId = "other-event",
} = {}) {
  const users = [
    {
      id: "viewer",
      status: "active",
      removed_at: null,
      system_role: "event_user",
      event_id: eventId,
      role_id: null,
    },
    {
      id: "outsider",
      status: "active",
      removed_at: null,
      system_role: "event_user",
      event_id: otherEventId,
      role_id: null,
    },
  ];

  // Legacy code-only fixtures: derive a matrix from manage_* codes when no
  // JSON description is supplied (mirrors deserializePermissionMatrix).
  let viewerMatrix;
  if (description) {
    viewerMatrix = JSON.parse(description);
  } else if (permissions.length) {
    viewerMatrix = matrix({
      event: permissions.includes("manage_event") ? "can_edit" : "restricted",
      registrationForm: permissions.includes("manage_registration_form")
        ? "can_edit"
        : "restricted",
      surveyForm: permissions.includes("manage_survey_form")
        ? "can_edit"
        : "restricted",
      dashboard: permissions.includes("manage_dashboard")
        ? "can_edit"
        : "restricted",
      canViewSubmissions: permissions.includes("manage_dashboard"),
      canManageSubmissions: permissions.includes("manage_dashboard"),
      canExport: permissions.includes("manage_dashboard"),
    });
  } else {
    viewerMatrix = matrix({
      event: "restricted",
      registrationForm: "restricted",
      surveyForm: "restricted",
      dashboard: "restricted",
    });
  }

  const collections = {
    users,
    event_access: [
      {
        id: "access-viewer",
        user_id: "viewer",
        event_id: eventId,
        role_name: "Viewer",
        can_manage_sub_users: false,
        matrix: viewerMatrix,
        deleted_at: null,
      },
      {
        id: "access-outsider",
        user_id: "outsider",
        event_id: otherEventId,
        role_name: "Outsider",
        can_manage_sub_users: false,
        matrix: matrix({ dashboard: "can_edit" }),
        deleted_at: null,
      },
    ],
    events: [
      {
        id: eventId,
        status: eventStatus,
        slug: "fixture",
        deleted_at: null,
      },
      {
        id: otherEventId,
        status: "open",
        slug: "other",
        deleted_at: null,
      },
    ],
  };

  class MockApiError extends Error {
    constructor(status) {
      super("Fixture request failed");
      this.status = status;
    }
  }

  function lookup(resourcePath) {
    const url = new URL(resourcePath, "https://fixture.example.test");
    const [, collection, id] = url.pathname.split("/");
    const rows = collections[collection];
    if (!rows) throw new MockApiError(404);
    if (id) {
      const row = rows.find(
        (candidate) => candidate.id === decodeURIComponent(id),
      );
      if (!row) throw new MockApiError(404);
      return row;
    }
    const filters = [...url.searchParams].filter(
      ([name]) => !name.startsWith("_"),
    );
    return rows.filter((row) =>
      filters.every(([key, value]) => String(row[key]) === value),
    );
  }

  const load = loadSource({
    "@/core/api/mock-client": {
      MockApiError,
      mockApi: {
        async get(path) {
          return lookup(path);
        },
      },
    },
  });

  return {
    getDashboardScope: load("src/services/event/dashboard-access.ts")
      .getDashboardScope,
    denyUnlessEventFormAccess: load("src/core/auth/api-guard.ts")
      .denyUnlessEventFormAccess,
    denyUnlessEventFormManager: load("src/core/auth/api-guard.ts")
      .denyUnlessEventFormManager,
    satisfiesAccessLevel: load("src/core/auth/event-permissions.ts")
      .satisfiesAccessLevel,
    deserializePermissionMatrix: load("src/core/auth/event-permissions.ts")
      .deserializePermissionMatrix,
    canAccessEventDashboard: load("src/core/event/dashboard-policy.ts")
      .canAccessEventDashboard,
  };
}

test("view_only dashboard and form modules can read but not mutate", async () => {
  const env = fixture({
    description: JSON.stringify(
      matrix({
        dashboard: "view_only",
        registrationForm: "view_only",
        surveyForm: "restricted",
      }),
    ),
  });

  const scope = await env.getDashboardScope("viewer");
  assert.ok(scope);
  assert.equal(scope.canManageDashboard, false);
  assert.equal(scope.canReadForm("registration"), true);
  assert.equal(scope.canManageForm("registration"), false);
  assert.equal(scope.canReadForm("survey"), false);
  assert.equal(scope.canManageForm("survey"), false);

  assert.equal(
    await env.denyUnlessEventFormAccess(
      "viewer",
      "registration",
      "view_only",
      "event",
    ),
    null,
  );
  assert.equal(
    (await env.denyUnlessEventFormAccess(
      "viewer",
      "registration",
      "can_edit",
      "event",
    )).status,
    403,
  );
  assert.equal(
    (await env.denyUnlessEventFormManager("viewer", "registration", "event"))
      .status,
    403,
  );
  assert.equal(
    (await env.denyUnlessEventFormAccess(
      "viewer",
      "survey",
      "view_only",
      "event",
    )).status,
    403,
  );
});

test("can_edit grants dashboard manage and form mutations for that module", async () => {
  const env = fixture({
    description: JSON.stringify(
      matrix({
        dashboard: "can_edit",
        registrationForm: "can_edit",
        surveyForm: "view_only",
      }),
    ),
  });

  const scope = await env.getDashboardScope("viewer");
  assert.ok(scope);
  assert.equal(scope.canManageDashboard, true);
  assert.equal(scope.canReadForm("registration"), true);
  assert.equal(scope.canManageForm("registration"), true);
  assert.equal(scope.canReadForm("survey"), true);
  assert.equal(scope.canManageForm("survey"), false);

  assert.equal(
    await env.denyUnlessEventFormManager("viewer", "registration", "event"),
    null,
  );
  assert.equal(
    (await env.denyUnlessEventFormManager("viewer", "survey", "event")).status,
    403,
  );
});

test("restricted dashboard blocks scope even when forms are editable", async () => {
  const env = fixture({
    description: JSON.stringify(
      matrix({
        dashboard: "restricted",
        registrationForm: "can_edit",
        surveyForm: "can_edit",
      }),
    ),
  });

  assert.equal(await env.getDashboardScope("viewer"), null);
  assert.equal(
    await env.denyUnlessEventFormAccess(
      "viewer",
      "registration",
      "view_only",
      "event",
    ),
    null,
  );
});

test("cross-event form reads are forbidden", async () => {
  const env = fixture({
    description: JSON.stringify(
      matrix({
        dashboard: "view_only",
        registrationForm: "view_only",
        surveyForm: "view_only",
      }),
    ),
  });

  assert.equal(
    (await env.denyUnlessEventFormAccess(
      "viewer",
      "registration",
      "view_only",
      "other-event",
    )).status,
    403,
  );
  assert.equal(
    (await env.denyUnlessEventFormAccess(
      "outsider",
      "registration",
      "view_only",
      "event",
    )).status,
    403,
  );
});

test("legacy permission codes still map manage_* to can_edit and absence to restricted", async () => {
  const env = fixture({
    description: null,
    permissions: ["manage_registration_form", "manage_dashboard"],
  });

  const scope = await env.getDashboardScope("viewer");
  assert.ok(scope);
  assert.equal(scope.canManageDashboard, true);
  assert.equal(scope.canReadForm("registration"), true);
  assert.equal(scope.canManageForm("registration"), true);
  // No manage_survey_form code → restricted (not readable) until matrix JSON says otherwise.
  assert.equal(scope.canReadForm("survey"), false);
  assert.equal(scope.canManageForm("survey"), false);

  const codesOnly = env.deserializePermissionMatrix(null, [
    "manage_registration_form",
  ]);
  assert.equal(codesOnly.registrationForm, "can_edit");
  assert.equal(codesOnly.surveyForm, "restricted");
  assert.equal(codesOnly.dashboard, "restricted");
  assert.equal(env.satisfiesAccessLevel(codesOnly.dashboard, "view_only"), false);
  assert.equal(env.satisfiesAccessLevel(codesOnly.dashboard, "can_edit"), false);
  assert.equal(
    env.canAccessEventDashboard("open", codesOnly.dashboard, "view_only"),
    false,
  );
  assert.equal(
    env.canAccessEventDashboard(
      "open",
      env.deserializePermissionMatrix(null, ["manage_dashboard"]).dashboard,
      "view_only",
    ),
    true,
  );
});

test("draft events stay outside the dashboard even with can_edit", async () => {
  const env = fixture({
    eventStatus: "draft",
    description: JSON.stringify(matrix({ dashboard: "can_edit" })),
  });
  assert.equal(await env.getDashboardScope("viewer"), null);
});
