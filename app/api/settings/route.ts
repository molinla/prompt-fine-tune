import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    const userId = "default-user";

    // Support batch get via query params: ?keys=key1,key2,key3
    const url = new URL(req.url);
    const keysParam = url.searchParams.get('keys');

    let settings;
    if (keysParam) {
        // Batch get specific keys
        const keys = keysParam.split(',').map(k => k.trim());
        settings = await prisma.userSetting.findMany({
            where: {
                userId,
                key: { in: keys }
            }
        });
    } else {
        // Get all settings
        settings = await prisma.userSetting.findMany({
            where: { userId }
        });
    }

    // Convert to a record for easy access
    const settingsMap = settings.reduce<Record<string, string>>((acc: Record<string, string>, curr: typeof settings[0]) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});

    return NextResponse.json(settingsMap);
}

export async function POST(req: Request) {
    const userId = "default-user";

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
