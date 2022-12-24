import sqlite from "sqlite3";
import * as fs from "fs";

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
      db.get(`SELECT * FROM tasks WHERE id = ?`, [id], (err, row) => {
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
      db.all(`SELECT * FROM tasks WHERE id in ?`, [ids], (err, rows) => {
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
  const task = await repo.findOne(task1Id);
  console.log(task);
}

await main();
