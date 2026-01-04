import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { seedInitialTestCases } from "@/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  let testCases = await prisma.testCase.findMany({
    where: { userId },
    include: {
      history: {
        orderBy: { timestamp: 'asc' }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  if (testCases.length === 0) {
    await seedInitialTestCases(userId);

    testCases = await prisma.testCase.findMany({
      where: { userId },
      include: {
        history: {
          orderBy: { timestamp: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  return NextResponse.json(testCases);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const data = await req.json();

  const testCase = await prisma.testCase.create({
    data: {
      userId,
      input: data.input || "",
      expectedCount: data.expectedCount ?? 5,
      validationScript: data.validationScript || null,
    },
    include: {
      history: {
        orderBy: { timestamp: 'asc' }
      }
    }
  });

  return NextResponse.json(testCase);
}
