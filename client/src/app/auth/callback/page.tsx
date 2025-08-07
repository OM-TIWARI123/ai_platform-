import { onAuthenticateUser } from '../../actions/user'
import { redirect } from 'next/navigation'
import React from 'react'


const AuthCallbackPage=async ()=>{

    const auth=await onAuthenticateUser()
    
    

    if(auth.status===200 || auth.status===201){
        console.log(auth.user?.id)
     // Check if user has workspaces before redirecting
     return redirect(`/interface/${auth.user?.id}`)
            // If no workspaces, redirect to create workspace
           
    }
    if(auth.status === 400 || auth.status === 500 || auth.status===403){
       redirect('/auth/signin')
        
        
    }

    
}

export default AuthCallbackPage