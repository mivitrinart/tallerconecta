import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";
import { tmpdir } from "os";

async function executeSeed() {
  const sql = readFileSync(join(process.cwd(), "scripts", "seed.sql"), "utf-8");
  
  // Split by semicolon followed by newline (end of statement)
  const statements = sql
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"));
  
  console.log(`Found ${statements.length} statements to execute`);
  
  // Batch size - execute 15 statements at a time
  const batchSize = 15;
  const batches: string[][] = [];
  
  for (let i = 0; i < statements.length; i += batchSize) {
    batches.push(statements.slice(i, i + batchSize));
  }
  
  console.log(`Executing ${batches.length} batches of up to ${batchSize} statements each...`);
  
  // Use full path to wrangler
  const wranglerPath = join(process.cwd(), "node_modules", ".bin", "wrangler.cmd");
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const batchSql = batch.join("; ") + ";";
    
    // Write to temp file
    const tempFile = join(tmpdir(), `seed-batch-${batchIndex}-${Date.now()}.sql`);
    writeFileSync(tempFile, batchSql, "utf-8");
    
    await new Promise<void>((resolve, reject) => {
      const child = spawn(wranglerPath, [
        "d1", "execute", "taller-conecta-db", 
        "--remote", "--file", tempFile
      ], {
        stdio: "pipe",
        cwd: process.cwd(),
        windowsHide: true,
        shell: true
      });
      
      let output = "";
      child.stdout.on("data", (data) => output += data.toString());
      child.stderr.on("data", (data) => output += data.toString());
      
      child.on("close", (code) => {
        // Clean up temp file
        try { unlinkSync(tempFile); } catch {}
        
        if (code === 0) {
          console.log(`✅ Batch ${batchIndex + 1}/${batches.length} executed (${batch.length} statements)`);
          resolve();
        } else {
          console.error(`❌ Batch ${batchIndex + 1} failed:`, output.slice(0, 500));
          reject(new Error(`Batch ${batchIndex + 1} failed with code ${code}`));
        }
      });
      
      child.on("error", (err) => {
        try { unlinkSync(tempFile); } catch {}
        console.error(`❌ Batch ${batchIndex + 1} spawn error:`, err.message);
        reject(err);
      });
    });
  }
  
  console.log("✅ All batches executed successfully!");
}

executeSeed().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});