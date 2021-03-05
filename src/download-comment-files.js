const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');
const util = require('util');
const path = require('path');
const fs   = require('fs');
const url  = require('url');
const got  = require('got');
const shell = require('shelljs');
const stream = require('stream');
const {CookieJar} = require('tough-cookie');

const md   = require('markdown-it')({html: true, linkify: true});
const fileType = require('file-type');
const htmlParser = require('node-html-parser');

const pipeline = util.promisify(stream.pipeline);

async function run() {
  try {
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const github = new GitHub(process.env.GITHUB_TOKEN);
    if (! context.eventName in ['issue_comment', 'issues']) {
      console.warn(`event name is not issue-related: ${context.eventName}`)
      return;
    }

    if (context.eventName == 'issues') {
      if (! context.action in ['opened', 'edited']) return;
    }

    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const suffix = core.getInput('suffix', { required: true });
    const output = core.getInput('output', { required: true });
    const suffixRe = new RegExp(suffix, 'gi');

    const issue = context.payload.issue;
    const repo  = context.payload.repository;
    const safe_title = issue.title.replace(/[<>|_]+/g, '_');
    const comment = context.eventName == 'issue_comment' ? context.payload.comment.body : context.payload.issue.body;
    const hashtags = comment.match(/(?<!#)#\S+/g).join('').replace(/[<>|_]+/g, '_');;
    console.log('hashtags', hashtags);
    
    const output_path = path.join(output, repo.name, safe_title + ' #' + path.basename(issue.url), hashtags);

    shell.mkdir('-p', output_path);


    const html = md.render(comment);
    const root = htmlParser.parse(html);
    const links = root.querySelectorAll('a');

    let downloaded_files = []; 
    let visited = {};
    for (let i = 0; i < links.length; i++) {
      const link = links[i];

      const href = link.getAttribute('href');
      const text = link.rawText;

      if (!href) continue;
      if (href in visited) continue;
      visited[href] = true;

      let filename = (text === href) ? path.basename(text) : text;
      filename = filename.replace(/[-!$%^&*()_+|~=`{}\[\]:";'<>?,\/\s]+/g, '_').toLowerCase();
      console.log('href:', filename, href);

      let options = { isStream: true, cookieJar: new CookieJar() };
      const parsed_url = url.parse(href);
      console.log('parsed url', parsed_url);
      if (parsed_url && parsed_url.hostname && parsed_url.hostname.indexOf('github.com') >= 0) {
        options.headers = {'authorization': 'token ' + process.env.GITHUB_TOKEN};
      }

      console.log('header', options);
      const saved = path.join(output_path, filename);
      try {
        console.log('downloading...', href, '->', saved);

        await pipeline(
          got(href, options),
          fs.createWriteStream(saved));

        const filetype = await fileType.fromStream(fs.createReadStream(saved));
        console.log('filetype:', saved, filetype);
        if (!filetype || (!suffixRe.test(filetype.ext) && !suffixRe.test(filetype.mime))) {
          fs.unlinkSync(saved);
          continue;
        } else {
          const new_saved = path.join(output_path, path.basename(filename, filetype.ext) + '.' + filetype.ext );
          fs.renameSync(saved, new_saved);
        }

        downloaded_files.push(saved);
      } catch (error) {
        console.log(util.inspect(error));
        if (fs.existsSync(saved)) {
          fs.unlinkSync(saved);
        }
      }
    }

    core.setOutput('files', downloaded_files);
  } catch (error) {
    console.log(util.inspect(error));
    core.setFailed(util.inspect(error));
  }
}

module.exports = run;
