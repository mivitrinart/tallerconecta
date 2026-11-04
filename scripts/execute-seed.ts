import { readFileSync } from "fs";
import { join } from "path";

async function executeSeed() {
  const sql = readFileSync(join(process.cwd(), "scripts", "seed.sql"), "utf-8");
  
  // Split by semicolon followed by newline (end of statement)
  const statements = sql
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"));
  
  console.log(`Found ${statements.length} statements to execute`);
  
  // Use wrangler to execute each statement
  const { spawn } = await import("child_process");
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt.trim()) continue;
    
    await new Promise((resolve, reject) => {
      const child = spawn("npx", ["wrangler", "d1", "execute", "taller-conecta-db", "--remote", "--command", stmt], {
        stdio: "pipe",
        cwd: process.cwd()
      });
      
      let output = "";
      child.stdout.on("data", (data) => output += data.toString());
      child.stderr.on("data", (data) => output += data.toString());
      
      child.on("close", (code) => {
        if (code === 0) {
          if (i % 20 === 0) console.log(`Executed ${i + 1}/${statements.length} statements`);
          resolve();
        } else {
          console.error(`Statement ${i + 1} failed:`, output);
          reject(new Error(`Statement ${i + 1} failed with code ${code}`));
        }
      });
    });
  }
  
  console.log("✅ All statements executed successfully!");
}

executeSeed().catch(console.error);