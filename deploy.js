<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>MyWeb Search</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #fff;
      color: #000;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1rem;
    }

    h1 {
      font-size: 3rem;
      font-weight: 600;
      margin-bottom: 2rem;
    }

    #query {
      font-size: 1.2rem;
      padding: 0.75rem 1rem;
      width: 80%;
      max-width: 600px;
      border-radius: 16px;
      border: 1px solid #ccc;
      box-shadow: 0 8px 20px rgba(0,0,0,0.05);
      margin-bottom: 1rem;
    }

    button {
      font-size: 1rem;
      padding: 0.6rem 1.2rem;
      border: none;
      background: black;
      color: white;
      border-radius: 12px;
      cursor: pointer;
    }

    .result {
      background: #f4f4f4;
      border-radius: 12px;
      padding: 1rem;
      margin-top: 1rem;
      max-width: 600px;
      width: 90%;
      box-shadow: 0 4px 8px rgba(0,0,0,0.05);
    }

    .result a {
      color: #0071e3;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <h1>🔍 MyWeb</h1>
  <input type="text" id="query" placeholder="Search Apple-style..." />
  <button onclick="search()">Search</button>
  <div id="results"></div>

  <script>
    async function search() {
      const q = document.getElementById("query").value;
      const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const resultsEl = document.getElementById("results");
      resultsEl.innerHTML = '';

      data.results.forEach(r => {
        const div = document.createElement("div");
        div.className = "result";
        div.innerHTML = `<strong>${r.title}</strong><br>${r.snippet}<br><a href="${r.link}" target="_blank">Visit</a>`;
        resultsEl.appendChild(div);
      });
    }
  </script>
</body>
</html>
