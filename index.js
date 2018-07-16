// Requires
const http = require('http');
const url = require('url');
const dotenv = require('dotenv');
const GitHub = require('github-api');

// Vars
const hostname = '127.0.0.1';
const port = 5000;

// Startup githup-api
dotenv.load();
var ghCredentials = {};
if (process.env.githubToken) {
  ghCredentials.token = process.env.githubToken;
} else if (process.env.githubUsername && process.env.githubPassword) {
  ghCredentials.username = process.env.githubUsername;
  ghCredentials.password = process.env.githubPassword;
}
const gh = new GitHub(ghCredentials);

// Serve it up
const server = http.createServer((req, res) => {

  // Skip processing for favicon.
  if (req.url === '/favicon.ico') {
    res.writeHead(200, {'Content-Type': 'image/x-icon'} );
    res.end();
    return;
  }

  // Set the output format based on URL param.
  const query = url.parse(req.url, true).query;
  const format = query.format || 'csv';

  // Basic response headers
  res.setHeader('Pragma', 'public');
  res.setHeader('Expires', '0');
  res.setHeader('Cache-Control', 'must-revalidate, post-check=0, pre-check=0');
  res.setHeader('Cache-Control', 'private');
  res.statusCode = 200;

  if ('csv' === format) {

    // CSV output response headers and CSV header.
    res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
    res.write(
      '"Name","URL","Description","Language","Updated","Stars","Issues"' + "\n"
    );
  } else if ('html' === format) {

    // HTML output response headers.
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
  } else {
    
    // Invalid format.
    res.statusCode = 500;
    res.end('Invalid format');
  }

  Promise.all([
    getRepos('auth0'),
    getRepos('auth0-community'),
    getRepos('auth0-samples')
  ])
    .then((data) => {

      // Combine all promised arrays into a single one to iterate through.
      var allRepos = [];
      data.forEach((repos) => {
        allRepos = allRepos.concat(repos);
      });
      allRepos = allRepos.sort(sortByStargazers);

      // Generate the formatted output for all repos.
      var output = '';
      allRepos.forEach((repo) => {
        output += formatOutput(repo, format);
      });

      // Display.
      res.end(output);
    })
    .catch((err) => {

      // Show the error message.
      res.end(err.response.data.message);
    })

});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

// Get all repos for an organization by name.
const getRepos = (name, format) => {

  return new Promise((resolve, reject) => {

    gh.getOrganization(name).getRepos((err, data) => {
      if (err) {
        reject (err);
      }
      resolve(data);
    });
  })
}

// Sort function to sort by stars.
const sortByStargazers = (a, b) => {
  if (a.stargazers_count > b.stargazers_count) {
    return -1;
  } else if (a.stargazers_count < b.stargazers_count) {
    return 1;
  }
  return 0;
}

// Return a formatted string from a single repo.
const formatOutput = (repo, format) => {
  if (repo.private || repo.fork || repo.archived || repo.stargazers_count < 1) {
    return '';
  }

  // Set a default description.
  description = '[no description]';
  if (repo.description) {
    description = repo.description.replace('  ', ' ');
    description = description.split('. Supported')[0];
  }
  repo.description = description;

  // Generate the output based on the format.
  return 'csv' === format ? repoCsv(repo) : repoHtml(repo);
}

// Output a repo object as a CSV row.
const repoCsv = (el) => {
  return '"' + el.full_name +
  '","' + el.html_url +
  '","' + el.description +
  '","' + el.language +
  '","' + el.updated_at.split('T')[0] +
  '","' + el.stargazers_count +
  '","' + el.open_issues_count +
  '"' + "\n";
}

// Output a repo object as an HTML list item.
const repoHtml = (el) => {
  return '<li>'
  + '<strong><a target="_blank" href="' + el.html_url + '">'
    + el.name + '</a></strong> '
  + '&nbsp;&nbsp;&nbsp;<a target="_blank" href='
    + el.html_url + '/stargazers>⭐️ ' + el.stargazers_count + '</a>'
  + '&nbsp;&nbsp;&nbsp;<a target="_blank" href='
    + el.html_url + '/issues?q=is%3Aopen>🐞 ' + el.open_issues_count + '</a>'
  + '<br><em>' + el.description + '</em>'
  + '<br><code>' + el.language + '</code> - '
  + '<small>' + el.updated_at.split('T')[0] + '</small>'
  + '</li>';
}
