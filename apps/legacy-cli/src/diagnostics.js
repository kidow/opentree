function createDiagnosticCheck(id, status, message, hints = [], details = []) {
  return {
    details,
    hints,
    id,
    message,
    status
  };
}

function createDiagnosticReport(command, cwd, checks, result = null) {
  const issues = checks
    .filter((check) => check.status === "fail")
    .map((check) => check.message);
  const issueCount = issues.length;
  const summary =
    issueCount === 0
      ? `[opentree] ${command} found no issues`
      : `[opentree] ${command} found ${issueCount} issue(s)`;

  return {
    checks,
    command,
    cwd,
    issueCount,
    issues,
    message: summary,
    ok: issueCount === 0,
    result,
    stage: "status",
    summary
  };
}

function renderDiagnosticTextReport(stdout, title, report) {
  stdout.write(`[opentree] ${title}\n`);

  report.checks.forEach((check) => {
    stdout.write(`[${check.status}] ${check.id}: ${check.message}\n`);
    check.hints.forEach((hint) => {
      stdout.write(`  hint: ${hint}\n`);
    });
    check.details.forEach((detail) => {
      stdout.write(`  - ${detail}\n`);
    });
  });

  stdout.write(`${report.summary}\n`);
}

module.exports = {
  createDiagnosticCheck,
  createDiagnosticReport,
  renderDiagnosticTextReport
};
