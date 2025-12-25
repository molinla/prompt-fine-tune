import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  // Support batch get via query params: ?keys=key1,key2,key3
  const url = new URL(req.url);
  const keysParam = url.searchParams.get('keys');
    
  let settings;
  if (keysParam) {
    const keys = keysParam.split(',').map(k => k.trim());
    settings = await prisma.userSetting.findMany({
      where: { 
        userId,
        key: { in: keys }
      }
    });
  } else {
    settings = await prisma.userSetting.findMany({
      where: { userId }
    });
  }

  const settingsMap = settings.reduce<Record<string, string>>((acc: Record<string, string>, curr: typeof settings[0]) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});

  return NextResponse.json(settingsMap);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { key, value } = await req.json();

  const setting = await prisma.userSetting.upsert({
    where: {
      userId_key: {
        userId,
        key
      }
    },
    update: { value },
    create: {
      userId,
      key,
      value
    }
  });

  return NextResponse.json(setting);
}
