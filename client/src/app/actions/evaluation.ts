'use server'
import { currentUser } from "@clerk/nextjs/server"
import { prisma } from '@/lib/prisma'

export const createEvaluation = async (evaluationData: {
    evaluation_id: string
    session_id: string
    role: string
    interview_data: any
    submitted_at: number
    status: string
    results: any
    completed_at: number
}) => {
    const user = await currentUser()
    if (!user) {
        return { status: 403, error: 'User not authenticated' }
    }

    try {
        const evaluation = await prisma.evaluation.create({
            data: {
                ...evaluationData,
                userId: user.id,
            },
        })

        return { status: 200, evaluation }
    } catch (error) {
        console.error('Error creating evaluation:', error)
        return { status: 500, error: 'Failed to create evaluation' }
    }
} 