


import * as lancedb from "@lancedb/lancedb";
import path from "node:path"
import fs from "node:fs"
import ollama from 'ollama';
import { v4 as uuidv4 } from 'uuid';

const DB_DIR = path.join(process.cwd(), 'lancedb');
const TABLE_NAME = 'posts';
const EMBED_MODEL = 'nomic-embed-text'; // modelo de embeddings do Ollama



function toDocText(p) {
  // Texto que será embutido (quanto mais sinal, melhor)
  return [
    `Usuário: ${p.user ?? ''}`,
    `Tópico: ${p.topic ?? ''}`,
    `Avaliação: ${p.rating ?? 0}`,
    `Conteúdo: ${p.content ?? ''}`
  ].join('\n');
}

async function embed(text) {
  const res = await ollama.embeddings({
    model: EMBED_MODEL,
    prompt: text
  });

  return res.embedding; // vetor (Array<number>)
}


(async () => {

    const raw = fs.readFileSync(path.join(process.cwd(), 'posts.json'), 'utf8');
    const posts = JSON.parse(raw);

    const db = await lancedb.connect("./lancedb");
    const tables = await db.tableNames();
    let table;

    if (!tables.includes(TABLE_NAME)) {
        table = await db.createTable(TABLE_NAME, [], {
            schema: {
            id: "int",
            user: "string",
            topic: "string",
            rating: "string",
            content: "string",
            vector: "vector[768]", // tamanho padrão do nomic-embed-text
        }
        });
    } else {
        table = await db.openTable(TABLE_NAME);
    }


    for (const p of posts) {
        const id = p.id || uuidv4();
        const text = toDocText(p);
        const vector = await embed(text);
        
        const doc = {
            id,
            user: p.user ?? null,
            topic: p.topic ?? null,
            rating: p.rating ?? 0,
            content: p.content ?? '',
            vector: vector
        }

        console.log("added");
        table.add([doc]);
    }



//   const db = await lancedb.connect("./lancedb");
//   const tbl = await db.createTable("posts", [
//     { id: 1, vector: [0.1, 0.2], content: "Olá mundo" }
//   ]);

//   const results = await tbl.vectorSearch([0.1, 0.2]).limit(5).toArray();
//   console.log(results);

    console.log('✅ Indexação concluída!');
})()