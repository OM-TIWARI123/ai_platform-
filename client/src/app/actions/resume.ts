'use server'
import { currentUser } from "@clerk/nextjs/server"
import { prisma } from '@/lib/prisma'

export const createResume = async (fileUrl: string) => {
    const user = await currentUser()
    if (!user) {
        return { status: 403, error: 'User not authenticated' }
    }

    try {
        const resume = await prisma.resume.create({
            data: {
                userId: user.id,
                fileUrl,
            },
        })

        return { status: 200, resume }
    } catch (error) {
        console.error('Error creating resume:', error)
        return { status: 500, error: 'Failed to create resume' }
    }
} 