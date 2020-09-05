const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');
const util = require('util');

async function run() {
  try {
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const github = new GitHub(process.env.GITHUB_TOKEN);
    if (context.eventName != 'issue_comment') {
      console.warn(`event name is not 'issue_comment': ${context.eventName}`)
    }

    const comment = context.payload.comment.body;
    console.log(`comment: ${comment}`);

    let downloaded_files = "no files";

    // Get owner and repo from context of payload that triggered the action
    const { owner, repo } = context.repo;

    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const suffix = core.getInput('suffix', { required: true });

    core.setOutput('files', downloaded_files);
  } catch (error) {
    console.log(util.inspect(error));
    core.setFailed(util.inspect(error));
  }
}

module.exports = run;
