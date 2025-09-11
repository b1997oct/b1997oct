import fs from "fs";
import { marked } from "marked";

const md = fs.readFileSync("README.md", "utf-8");
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Barath M N | Software Applications & Technology</title>

<meta name="description" content="Barath (@b1997oct) — software developer creating job portals, e-commerce, chat apps, dashboards, and more with React, Next.js, Node.js, and modern databases.">
<meta name="keywords" content="Barath, b1997oct, Software Developer, Full-Stack Developer, JavaScript, React, Next.js, Node.js, MongoDB, PostgreSQL, MySQL">
<meta name="author" content="Barath M N">
<meta name="robots" content="index, follow">
<meta name="source" content="https://github.com/b1997oct/b1997oct">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- Open Graph -->
<meta property="og:title" content="Barath M N | Software Applications & Technology">
<meta property="og:description" content="Building impactful apps — job portals, e-commerce, chat apps, dashboards, and more.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://b1997oct.vercel.app/">
<meta property="og:image" content="https://b1997oct.vercel.app/hey-dino.gif">
<meta property="og:site_name" content="Barath M N">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Barath M N | Software Applications & Technology">
<meta name="twitter:description" content="Software developer passionate about impactful apps and full-stack solutions.">
<meta name="twitter:image" content="https://b1997oct.vercel.app/working-cat.gif">
<meta name="twitter:creator" content="@b1997oct">

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css/github-markdown.min.css">
  <style>
    body { display: flex; justify-content: center; }
    .markdown-body { max-width: 900px; padding: 20px; }
  </style>
</head>
<body>
  <article class="markdown-body">
    ${marked(md)}
    
     <!-- content source link -->
    <div>
      🌟
      <a href="https://github.com/b1997oct/b1997oct" target="_blank" rel="noopener noreferrer"
        class="inline-flex items-center px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
         Content Source
      </a>
    </div>
  </article>
</body>
</html>`;

fs.writeFileSync("public/index.html", html);
fs.copyFileSync("README.md", "public/README.md");
console.log("✅ README built into public/index.html");
