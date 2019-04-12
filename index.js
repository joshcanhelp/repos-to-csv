// requires
const http = require("http");
const url = require("url");

// npm packages
const dotenv = require("dotenv");
dotenv.load();

// Startup githup-api
let ghCredentials = {};
if (process.env.githubToken) {
  ghCredentials.token = process.env.githubToken;
} else if (process.env.githubUsername && process.env.githubPassword) {
  ghCredentials.username = process.env.githubUsername;
  ghCredentials.password = process.env.githubPassword;
}

const GitHub = require("github-api");
const gh = new GitHub(ghCredentials);

// Serve it up!
const hostname = "127.0.0.1";
const port = 5000;
const server = http.createServer((req, res) => {
  // Skip processing for favicon.
  if (req.url === "/favicon.ico") {
    res.writeHead(200, { "Content-Type": "image/x-icon" });
    res.end();
    return;
  }

  // URL parameters to change data gathered and output provided.
  const query = url.parse(req.url, true).query;
  const repos = query.repos;
  const format = query.format || "csv";
  const minStars = query.stars || 1;
  const inclTopic = query.topic || "";

  // Check for repos
  if (!repos) {
    res.statusCode = 500;
    res.end("URL parameter `repos` is required.");
    return;
  }

  // Check format parameter
  if (!["csv", "html"].includes(format)) {
    res.statusCode = 500;
    res.end('URL parameter `format` can only be "csv" or "html".');
    return;
  }
  const isCsv = "csv" === format;

  // Basic response headers
  res.setHeader("Pragma", "public");
  res.setHeader("Expires", "0");
  res.setHeader("Cache-Control", "must-revalidate, post-check=0, pre-check=0");
  res.setHeader("Cache-Control", "private");
  res.setHeader(
    "Content-Type",
    `text/${isCsv ? "plain" : "html"}; charset=UTF-8`
  );
  res.statusCode = 200;

  // Set Promises for getting repos.
  const promises = [];
  repos.split(",").forEach(name => {
    promises.push(getRepos(name, minStars, inclTopic));
  });

  Promise.all(promises)
    .then(data => {
      // Combine all promised arrays into a single one to iterate through.
      let allRepos = [];
      data.forEach(repos => {
        allRepos = allRepos.concat(repos);
      });
      allRepos = allRepos.sort(sortByStargazers);

      // Generate the formatted output for all repos.
      let output = "";
      allRepos.forEach(repo => {
        // Filter out forks (can't be done in search)
        if (!repo.fork) {
          output += isCsv ? repoCsv(repo) : repoHtml(repo);
        }
      });

      // Display.
      res.end(wrapOutput(output, isCsv));
    })
    .catch(err => {
      // Show the error message.
      console.log(err.response.data);
      res.end(err.response.data.message);
    });
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

// Get all repos for an organization by name.
const getRepos = (name, minStars, inclTopic) => {
  return new Promise((resolve, reject) => {
    let query = `org:${name} is:public archived:false`;

    if (inclTopic) {
      query += ` topic:${inclTopic}`;
    }

    if (minStars) {
      query += ` stars:>=${minStars}`;
    }

    gh.search().forRepositories({ q: query }, (error, results) => {
      if (error) {
        reject(error);
      }
      resolve(results);
    });
  });
};

// Sort by stars, desc
const sortByStargazers = (a, b) => {
  if (a.stargazers_count > b.stargazers_count) {
    return -1;
  }

  if (a.stargazers_count < b.stargazers_count) {
    return 1;
  }
  return 0;
};

// Output a repo object as a CSV row.
const repoCsv = el => {
  return (
    '"' +
    el.full_name +
    '","' +
    el.html_url +
    '","' +
    el.description +
    '","' +
    el.language +
    '","' +
    el.updated_at.split("T")[0] +
    '","' +
    el.stargazers_count +
    '","' +
    el.open_issues_count +
    '"' +
    "\n"
  );
};

// Output a repo object as an HTML list item.
const repoHtml = el => {
  return `
    <li>
      <strong><a target="_blank" href="${el.html_url}">${
    el.name
  }</a></strong>&nbsp;&nbsp;&nbsp;
      <a target="_blank" href="${el.html_url}/stargazers">⭐️ ${
    el.stargazers_count
  }</a>&nbsp;&nbsp;&nbsp;
      <a target="_blank" href="${el.html_url}/issues?q=is%3Aopen">🐞 ${
    el.open_issues_count
  }</a><br>
      <small><em>${el.description || "[no description]"}</em></small><br>
      <code>${el.language}</code> - <small>${
    el.updated_at.split("T")[0]
  }</small>
    </li>
    `;
};

// Wrap output based on format.
const wrapOutput = (content, isCsv) => {
  if (isCsv) {
    return (
      '"Name","URL","Description","Language","Updated","Stars","Issues"' +
      "\n" +
      content
    );
  }

  return `
    <!DOCTYPE HTML><html>
    <head>
      <meta charset="UTF-8"><title>GitHub Repos</title>
      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css">
    </head>
    <body><div class="container"><ol>${content}</ol></div></body>
    </html>
  `;
};
