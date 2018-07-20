# Repos to CSV

Get all public, source, non-archived repos from a GitHub organization and display as CSV or HTML.

## Installation

Clone, install, configure, and go!

```bash
git clone git@github.com:joshcanhelp/repos-to-csv.git
cd repos-to-csv
cp example.env .env
vim .env
```

Add your [personal access token](https://github.com/settings/tokens) or username and password to increase your API limits (not required but greatly helps if you're troubleshooting).

Now, install:

```bash
npm install
node index.js
```

Open your browser and go to [localhost:5000?format=html&repos=github-tools](http://localhost:5000/?format=html&repos=github-tools) and you should see all the public, source, non-archived repos from [Tools for GitHub](https://github.com/github-tools?utf8=%E2%9C%93&q=stars%3A%3E1&type=source&language=) with more than one star.

![Output example](screenshot-01.png)

Options:

- Change `format` to `csv` to get a CSV output you can save and open in Excel, Google Docs, or another editor.
- Add multiple repos, separated by a comma, to see multiple orgs together.
