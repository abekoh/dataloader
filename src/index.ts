import sqlite from "sqlite3";
import * as fs from "fs";
import {DataLoader} from "./dataloader";

type Task = {
  id: string;
  content: string;
};

const dbPath = "dev.db";

const db = new sqlite.Database(dbPath);

const task1Id = "167D5887-B518-49DE-9526-CAEC7DD8339E";
const task2Id = "148CC48B-92EA-4CA5-BF79-213FC02746F6";

const seeds: Task[] = [
  {
    id: task1Id,
    content: "content1",
  },
  {
    id: task2Id,
    content: "content2",
  },
];

function initDatabase() {
  if (fs.existsSync(dbPath)) {
    return;
  }
  db.run(
      "CREATE TABLE tasks(id TEXT PRIMARY KEY, content TEXT NOT NULL)",
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        seeds.forEach((task) => {
          db.run(
              `INSERT INTO tasks(id, content) VALUES(?, ?)`,
              [task.id, task.content],
              (err) => {
                if (err) {
                  console.error(err);
                }
              }
          );
        });
      }
  );
}

class TaskRepository {
  findOne(id: string): Promise<Task> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM tasks WHERE id = ?`;
      console.debug(`get: ${sql}, ${id}`);
      db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(this.rowToTask(row));
        }
      });
    });
  }

  findMany(ids: string[]): Promise<Task[]> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM tasks WHERE id in ?`;
      console.debug(`get: ${sql}, ${ids}`);
      db.all(sql, [ids], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map((row) => this.rowToTask(row)));
        }
      });
    });
  }

  private rowToTask(row: any): Task {
    return {
      id: row.id,
      content: row.content,
    };
  }
}


async function main() {
  initDatabase();
  const repo = new TaskRepository();

  const taskLoader = new DataLoader<string, Task>(ids => new Promise((resolve, reject) => {
    repo.findMany(ids).then(tasks => {
      resolve(tasks);
    }).catch(e => {
      reject(e);
    })
  }))
  const promise1 = taskLoader.load(task1Id);
  const promise2 = taskLoader.load(task2Id);
  const [task1, task2] = await Promise.all([promise1, promise2]);
  console.log(task1, task2);
}

await main();
