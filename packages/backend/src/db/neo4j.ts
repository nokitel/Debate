import neo4j, { type Driver, type Session } from "neo4j-driver";

let driver: Driver | null = null;

/** Get the Neo4j driver singleton. Creates it on first call. */
export function getDriver(): Driver {
  if (!driver) {
    const uri = process.env["NEO4J_URI"] ?? "bolt://localhost:7687";
    const user = process.env["NEO4J_USER"] ?? "neo4j";
    const password = process.env["NEO4J_PASSWORD"] ?? "dialectical";
    const maxPoolSize = parseInt(process.env["NEO4J_MAX_POOL_SIZE"] ?? "50", 10);

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionPoolSize: maxPoolSize,
      connectionAcquisitionTimeout: 30_000,
    });
  }
  return driver;
}

/** Get a new Neo4j session. Caller is responsible for closing it. */
export function getSession(): Session {
  return getDriver().session();
}

/** Initialize Neo4j schema: constraints, indexes. Idempotent. */
export async function initSchema(): Promise<void> {
  const session = getSession();
  try {
    // Uniqueness constraints
    await session.run(
      "CREATE CONSTRAINT debate_id_unique IF NOT EXISTS FOR (d:Debate) REQUIRE d.id IS UNIQUE",
    );
    await session.run(
      "CREATE CONSTRAINT argument_id_unique IF NOT EXISTS FOR (a:Argument) REQUIRE a.id IS UNIQUE",
    );
    await session.run(
      "CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
    );
    await session.run(
      "CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE",
    );

    // Full-text index for argument search
    await session.run(
      `CREATE FULLTEXT INDEX argument_text_fulltext IF NOT EXISTS
       FOR (a:Argument) ON EACH [a.text]`,
    );

    // Vector index for semantic dedup (384-dim, cosine similarity)
    await session.run(
      `CREATE VECTOR INDEX argument_embedding IF NOT EXISTS
       FOR (a:Argument) ON (a.embedding)
       OPTIONS { indexConfig: {
         \`vector.dimensions\`: 384,
         \`vector.similarity_function\`: 'cosine'
       }}`,
    );

    // Composite indexes for query performance
    await session.run(
      "CREATE INDEX debate_status_createdAt IF NOT EXISTS FOR (d:Debate) ON (d.status, d.createdAt)",
    );
    await session.run(
      "CREATE INDEX argument_debateId IF NOT EXISTS FOR (a:Argument) ON (a.debateId)",
    );
    await session.run(
      "CREATE INDEX argument_parentId IF NOT EXISTS FOR (a:Argument) ON (a.parentId)",
    );
    await session.run(
      "CREATE INDEX rejected_debateId IF NOT EXISTS FOR (r:RejectedArgument) ON (r.debateId)",
    );
    await session.run(
      "CREATE INDEX user_walletAddress IF NOT EXISTS FOR (u:User) ON (u.walletAddress)",
    );
  } finally {
    await session.close();
  }
}

/** Close the driver connection pool. Call on shutdown. */
export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

/** Verify connectivity by running a trivial query. */
export async function verifyConnectivity(): Promise<boolean> {
  const session = getSession();
  try {
    await session.run("RETURN 1 AS ok");
    return true;
  } catch {
    return false;
  } finally {
    await session.close();
  }
}
