import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const data = await req.json();

    // Handle history addition separately if needed, or update fields
    if (data.historyItem) {
        const historyItem = await prisma.historyItem.create({
            data: {
                testCaseId: id,
                successRate: data.historyItem.successRate,
                timestamp: data.historyItem.timestamp ? new Date(data.historyItem.timestamp) : new Date(),
            }
        });
        return NextResponse.json(historyItem);
    }

    // Handle history reset
    if (data.resetHistory) {
        await prisma.historyItem.deleteMany({
            where: { testCaseId: id }
        });
        return NextResponse.json({ success: true });
    }

    const testCase = await prisma.testCase.update({
        where: { id, userId },
        data: {
            input: data.input,
            expectedCount: data.expectedCount,
            validationScript: data.validationScript,
        }
    });

    return NextResponse.json(testCase);
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;

    await prisma.testCase.delete({
        where: { id, userId }
    });

    return NextResponse.json({ success: true });
}
