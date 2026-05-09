function buildBashCompletion() {
  return `#!/usr/bin/env bash
_opentree_completion() {
  local cur prev words cword
  _init_completion || return

  local commands="init build dev deploy doctor validate import schema prompt config profile site meta theme link vercel completion help"

  if [[ $cword -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
    return
  fi

  case "\${words[1]}" in
    config)
      COMPREPLY=( $(compgen -W "show" -- "$cur") )
      ;;
    profile|site|meta|theme)
      COMPREPLY=( $(compgen -W "set" -- "$cur") )
      ;;
    link)
      COMPREPLY=( $(compgen -W "add list move remove update" -- "$cur") )
      ;;
    vercel)
      COMPREPLY=( $(compgen -W "link status unlink" -- "$cur") )
      ;;
    completion)
      COMPREPLY=( $(compgen -W "bash zsh" -- "$cur") )
      ;;
  esac
}

complete -F _opentree_completion opentree
`;
}

function buildZshCompletion() {
  return `#compdef opentree

_opentree() {
  local -a commands
  commands=(
    'init:Create a starter config'
    'build:Generate the site'
    'dev:Start the preview server'
    'deploy:Build and deploy'
    'doctor:Check readiness'
    'validate:Validate the config'
    'import:Import links from JSON'
    'schema:Print runtime command schemas'
    'prompt:Apply deterministic prompt edits'
    'config:Inspect config'
    'profile:Edit profile fields'
    'site:Edit site URL'
    'meta:Edit metadata'
    'theme:Edit theme colors'
    'link:Manage links'
    'vercel:Manage Vercel linkage'
    'completion:Print shell completion'
    'help:Show help'
  )

  if (( CURRENT == 2 )); then
    _describe 'command' commands
    return
  fi

  case "$words[2]" in
    config)
      _arguments '1: :((show))'
      ;;
    profile|site|meta|theme)
      _arguments '1: :((set))'
      ;;
    link)
      _arguments '1: :((add list move remove update))'
      ;;
    vercel)
      _arguments '1: :((link status unlink))'
      ;;
    completion)
      _arguments '1: :((bash zsh))'
      ;;
  esac
}

_opentree "$@"
`;
}

async function runCompletionCommand(io, args = []) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const requestedJson = args.includes("--json");
  const filteredArgs = args.filter((arg) => arg !== "--json");
  const [shell] = filteredArgs;
  const report = {
    command: "completion",
    issues: [],
    message: "",
    ok: false,
    result: null,
    stage: "args"
  };

  if (shell === "bash") {
    const script = buildBashCompletion();
    if (requestedJson) {
      report.ok = true;
      report.message = "generated bash completion";
      report.result = {
        script,
        shell
      };
      report.stage = "load";
      stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return 0;
    }

    stdout.write(script);
    return 0;
  }

  if (shell === "zsh") {
    const script = buildZshCompletion();
    if (requestedJson) {
      report.ok = true;
      report.message = "generated zsh completion";
      report.result = {
        script,
        shell
      };
      report.stage = "load";
      stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return 0;
    }

    stdout.write(script);
    return 0;
  }

  report.issues = ["usage: opentree completion <bash|zsh>"];
  report.message = "usage: opentree completion <bash|zsh>";
  stderr.write("[opentree] usage: opentree completion <bash|zsh>\n");
  if (requestedJson) {
    stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  }
  return 1;
}

module.exports = {
  buildBashCompletion,
  buildZshCompletion,
  runCompletionCommand
};
