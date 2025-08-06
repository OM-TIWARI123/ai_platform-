import {  Menu , User } from "lucide-react";
import  Image  from "next/image";
import React from "react";
import Link from "next/link";


type Props = {}

const LandingPageNavBar = (props: Props) => {
  return <div className="flex w-full justify-between items-center">
    <div className="text-3xl font-semibold flex item-center gap-x-3">
        <Menu className="w-6 h-6"/>
        <Image 
            alt="logo"
            src="/opal-local.svg"
            width={40}
            height={40}
        />
    </div>
    <div className="hidden gap-x-10 items-center lg:flex">
        <Link href="/"
        className="bg-[#7320DD] py-2 px-5 font semibold text-lg rounded-full hover:bg-[#7320DD]/80"
        >
            Home
        </Link>
        <Link href="/">Pricing</Link>
        <Link href="/">Contact</Link>
        <Link href="/auth/signin">
        <button className="text-base flex gap-x-2">
            <User fill="#000"/>
            Login
        </button>
           
        </Link>

      </div>
      LandingPageNavBar
  </div>
};

export default LandingPageNavBar;