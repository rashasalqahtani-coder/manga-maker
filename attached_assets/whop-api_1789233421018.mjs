const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
const token = process.env.REPL_IDENTITY ? "repl " + process.env.REPL_IDENTITY
  : process.env.WEB_REPL_RENEWAL ? "depl " + process.env.WEB_REPL_RENEWAL : null;

const [method, path, bodyJson] = process.argv.slice(2);
if (!method || !path) process.exit(1);
const response = await fetch(`https://${hostname}/api/v2/proxy/${path}`, {
  method,
  headers: {
    "Content-Type": "application/json",
    "X-Replit-Token": token,
    "Connector-Name": "whop",
  },
  ...(bodyJson ? { body: bodyJson } : {}),
});
console.log(JSON.stringify(await response.json(), null, 2));