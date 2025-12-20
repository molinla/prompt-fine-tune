import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const settings = await prisma.userSetting.findMany({
        where: { userId }
    });

    // Convert to a record for easy access
    const settingsMap = settings.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {} as Record<string, string>);

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
