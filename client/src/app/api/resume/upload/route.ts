import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { userId, fileUrl } = await req.json();

    const resume = await prisma.resume.create({
      data: {
        userId,
        fileUrl,
      },
    });

    return NextResponse.json(resume);
  } catch (error) {
    console.error('Error creating resume:', error);
    return NextResponse.json(
      { error: 'Failed to create resume' },
      { status: 500 }
    );
  }
} 