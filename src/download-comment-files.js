const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');
const util = require('util');
const path = require('path');
const fs   = require('fs');
const got  = require('got');

const md   = require('markdown-it')({html: true, linkify: true});
const fileType = require('file-type');
const htmlParser = require('node-html-parser');

async function run() {
  try {
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const github = new GitHub(process.env.GITHUB_TOKEN);
    if (context.eventName != 'issue_comment') {
      console.warn(`event name is not 'issue_comment': ${context.eventName}`)
    }

    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const suffix = core.getInput('suffix', { required: true });
    const suffixRe = new RegExp(suffix, 'gi');

    const issue = context.payload.issue;
    const safe_title = issue.title.replace(/[\s<>|_]+/g, '_');
    const output_path = safe_title + '_#' + path.basename(issue.url);

    if (!fs.existsSync(output_path)) {
      fs.mkdirSync(output_path);
    }

    const comment = context.payload.comment.body;

    const html = md.render(comment);
    const root = htmlParser.parse(html);
    const links = root.querySelectorAll('a');

    let downloaded_files = []; 
    let visited = {};
    for (let i = 0; i < links.length; i++) {
      const link = links[i];

      const url  = link.getAttribute('href');
      const text = link.rawText;

      if (url in visited) continue;
      visited[url] = true;

      const filename = (text === url) ? path.basename(text) : text;
      console.log('url:', filename, url);

      const filetype = await fileType.fromStream(got.stream(url));
      if (!filetype) continue;

      console.log('filetype:', url, filetype);

      if (suffixRe.test(filetype.ext)) {
        console.log('downloading...', url);
        const saved = path.join(output_path, filename);
        got.stream(url).pipe(fs.createWriteStream(saved));
        downloaded_files.push(saved);
      }
    }

    // Get owner and repo from context of payload that triggered the action
    const { owner, repo } = context.repo;

    core.setOutput('files', downloaded_files);
  } catch (error) {
    console.log(util.inspect(error));
    core.setFailed(util.inspect(error));
  }
}

module.exports = run;
