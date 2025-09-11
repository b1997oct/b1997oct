import fs from "fs";
import { marked } from "marked";

const md = fs.readFileSync("README.md", "utf-8");
const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Barath M N</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css/github-markdown.min.css">
  <style>
    body { display: flex; justify-content: center; }
    .markdown-body { max-width: 900px; padding: 20px; }
  </style>
</head>
<body>
  <article class="markdown-body">
    ${marked(md)}
  </article>
</body>
</html>
`;

fs.writeFileSync("public/index.html", html);
fs.copyFileSync("README.md", "public/README.md");
console.log("✅ README built into public/index.html");
