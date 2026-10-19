import type { Env } from "@/config";
import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool, type QueryResultRow } from "pg";

export function databaseUrl(baseUrl: string, database: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

export function databaseName(baseUrl: string): string {
  return decodeURIComponent(new URL(baseUrl).pathname.slice(1));
}

function quoteIdentifier(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

@Injectable()
export class DatabaseAdmin implements OnModuleDestroy {
  // PrismaModule sits below LoggingModule, so this goes through the app logger instead of injecting it.
  private readonly logger = new Logger(DatabaseAdmin.name);
  private pool: Pool | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {}

  urlFor(database: string): string {
    return databaseUrl(this.config.get("DATABASE_URL"), database);
  }

  baseDatabase(): string {
    return databaseName(this.config.get("DATABASE_URL"));
  }

  // Postgres refuses to copy a database while anyone else is connected to it.
  async cloneDatabase(name: string, template: string): Promise<void> {
    await this.terminateConnections(template);
    await this.query(
      `CREATE DATABASE ${quoteIdentifier(name)} TEMPLATE ${quoteIdentifier(template)}`,
    );
  }

  async dropDatabase(name: string): Promise<void> {
    await this.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(name)} WITH (FORCE)`);
  }

  async renameDatabase(from: string, to: string): Promise<void> {
    await this.terminateConnections(from);
    await this.query(`ALTER DATABASE ${quoteIdentifier(from)} RENAME TO ${quoteIdentifier(to)}`);
  }

  async listDatabases(prefix: string): Promise<string[]> {
    const result = await this.query<{ datname: string }>(
      "SELECT datname FROM pg_database WHERE starts_with(datname, $1)",
      [prefix],
    );
    return result.rows.map((row) => row.datname);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }

  private async terminateConnections(database: string): Promise<void> {
    await this.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [database],
    );
  }

  private query<Row extends QueryResultRow>(sql: string, values: unknown[] = []) {
    if (!this.pool) {
      this.pool = new Pool({ connectionString: this.urlFor("postgres"), max: 1 });
      this.pool.on("error", (error) => this.logger.error(`admin pool error: ${String(error)}`));
    }
    return this.pool.query<Row>(sql, values);
  }
}
