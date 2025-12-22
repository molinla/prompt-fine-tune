
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import prisma from '@/lib/prisma';


export async function seedInitialTestCases(userId: string) {
  const csvPath = path.join(process.cwd(), 'assets', 'TestCase.csv');

  if (!fs.existsSync(csvPath)) {
    console.warn(`Seed file not found at ${csvPath}`);
    return;
  }

  try {
    const fileContent = fs.readFileSync(csvPath, 'utf-8');

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    const testCasesToCreate = records.map((record: any) => ({
      userId: userId,
      input: record.input,
      expectedCount: record.expectedCount ? parseInt(record.expectedCount, 10) : 5,
      validationScript: record.validationScript || null,
    }));

    // Insert test cases
    if (testCasesToCreate.length > 0) {
      await prisma.testCase.createMany({
        data: testCasesToCreate,
      });
    }
  } catch (error) {
    console.error("Failed to seed initial test cases:", error);
    // We swallow the error to not block the user from seeing their (empty) list,
    // but in a real app we might want to retry or alert.
    // However, if we fail to seed, we shouldn't mark as seeded?
    // The transaction ensures atomicity. If it fails, nothing happens.
    // So next time they visit, we try again.
  }
}
