'use server';

import { prisma } from '@/lib/prisma'; // Adjust path to your Prisma instance

interface CreateResumeParams {
  userId: string;
  fileBytes: number[];
  fileName: string;
  fileType: string;
}

export async function createResume(params: CreateResumeParams) {
  try {
    const { userId, fileBytes, fileName, fileType } = params;

    // Convert number array back to Buffer/Bytes
    const fileBuffer = Buffer.from(fileBytes);

    // Store resume in database
    const resume = await prisma.resume.create({
      data: {
        userId: userId,
        file: fileBuffer, // Store as Bytes
        uploadedAt: new Date(),
      },
    });

    console.log(`Resume stored successfully for user ${userId}:`, {
      resumeId: resume.id,
      fileName,
      fileSize: fileBytes.length,
      fileType
    });

    return {
      status: 200,
      message: 'Resume stored successfully',
      resumeId: resume.id,
    };

  } catch (error) {
    console.error('Error storing resume:', error);
    return {
      status: 500,
      error: 'Failed to store resume',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Optional: Helper function to retrieve resume
export async function getResume(resumeId: string) {
  try {
    const resume = await prisma.resume.findUnique({
      where: {
        id: resumeId,
      },
      include: {
        user: {
          select: {
            id: true,
            // Add other user fields you want to include
          },
        },
      },
    });

    if (!resume) {
      return {
        status: 404,
        error: 'Resume not found',
      };
    }

    return {
      status: 200,
      resume: {
        id: resume.id,
        userId: resume.userId,
        fileData: resume.file,
        uploadedAt: resume.uploadedAt,
        user: resume.user,
      },
    };

  } catch (error) {
    console.error('Error retrieving resume:', error);
    return {
      status: 500,
      error: 'Failed to retrieve resume',
    };
  }
}

// Optional: Helper function to get user's latest resume
export async function getUserLatestResume(userId: string) {
  try {
    const resume = await prisma.resume.findFirst({
      where: {
        userId: userId,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    if (!resume) {
      return {
        status: 404,
        error: 'No resume found for user',
      };
    }

    return {
      status: 200,
      resume: {
        id: resume.id,
        userId: resume.userId,
        fileData: resume.file,
        uploadedAt: resume.uploadedAt,
      },
    };

  } catch (error) {
    console.error('Error retrieving user resume:', error);
    return {
      status: 500,
      error: 'Failed to retrieve user resume',
    };
  }
}