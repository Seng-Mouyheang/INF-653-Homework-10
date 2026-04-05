const MongoDBProvider = require("./MongoDBProvider");
const SupabaseProvider = require("./SupabaseProvider");

async function createDatabaseProvider() {
  // eslint-disable-next-line no-undef
  const rawProvider = (
    process.env.DB_PROVIDER ||
    process.env.DB_TYPE ||
    "mongodb"
  )
    .trim()
    .toLowerCase();
  const providerKey = rawProvider === "mongo" ? "mongodb" : rawProvider;

  let provider;

  if (providerKey === "mongodb") {
    provider = new MongoDBProvider();
  } else if (providerKey === "supabase" || providerKey === "postgres") {
    provider = new SupabaseProvider();
  } else {
    throw new Error(
      `Unknown database provider: "${rawProvider}". Expected "mongodb" (or "mongo"), or "supabase"`,
    );
  }

  // Connect and initialize the provider
  await provider.connect();

  return provider;
}

module.exports = createDatabaseProvider;
