import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // remove special characters except spaces and hyphens
    .replace(/\s+/g, "-") // replace spaces with hyphens
    .replace(/-+/g, "-") // replace multiple hyphens with single
    .trim()
    .replace(/^-|-$/g, ""); // remove leading/trailing hyphens
};

const generateUniqueSlug = async (baseSlug: string): Promise<string> => {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existingEvent = await prisma.event.findUnique({
      where: { slug },
    });

    if (!existingEvent) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }
};

const migrateEventSlugs = async (): Promise<void> => {
  try {
    console.log("Starting event slug migration...");

    // Use raw query to find events where slug is null or empty
    const eventsWithoutSlug = await prisma.$queryRaw<
      Array<{ id: string; title: string; slug: string | null }>
    >`
      SELECT id, title, slug FROM events WHERE slug IS NULL OR slug = '' OR slug = 'default-slug'
    `;

    console.log(
      `Found ${eventsWithoutSlug.length} events without proper slugs`,
    );

    for (const event of eventsWithoutSlug) {
      try {
        const baseSlug = generateSlug(event.title);
        const uniqueSlug = await generateUniqueSlug(baseSlug);

        await prisma.event.update({
          where: { id: event.id },
          data: { slug: uniqueSlug },
        });

        console.log(`Updated event "${event.title}" with slug "${uniqueSlug}"`);
      } catch (error) {
        console.error(`Failed to update event "${event.title}":`, error);
      }
    }

    console.log("Event slug migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

// Run the migration
migrateEventSlugs()
  .then(() => {
    console.log("Migration script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });
