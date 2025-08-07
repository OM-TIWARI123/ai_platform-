'use server'
import { currentUser } from "@clerk/nextjs/server"
import { prisma } from '@/lib/prisma'

export const onAuthenticateUser = async () => {
    console.log("entering ......")
    const user = await currentUser()
    if (!user) {
        return { status: 403 }
    }
    const existingUser = await prisma.user.findUnique({
        where: {
            clerkId: user.id
        }
    })
    if (existingUser) {
        console.log(existingUser)
        return { status: 201, user: existingUser }
    }

    const newUser = await prisma.user.create({
        data: {
            clerkId: user.id,
            email: user.emailAddresses[0].emailAddress,
            name: user.fullName
        }
    })

    console.log(newUser)
    return { status: 200, user: newUser }
}