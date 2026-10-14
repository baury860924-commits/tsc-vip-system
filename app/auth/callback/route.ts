import {NextRequest,NextResponse} from "next/server";
import {createServerClient} from "@supabase/ssr";
export async function GET(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const origin=request.nextUrl.origin;
 if(!url||!key)return NextResponse.redirect(new URL("/login?error=configuration",origin));
 const code=request.nextUrl.searchParams.get("code");
 if(!code)return NextResponse.redirect(new URL("/login?error=missing-code",origin));
 const response=NextResponse.redirect(new URL("/login?status=verified",origin));
 const supabase=createServerClient(url,key,{cookies:{getAll(){return request.cookies.getAll();},setAll(cookies){cookies.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
 const {error}=await supabase.auth.exchangeCodeForSession(code);
 if(error)return NextResponse.redirect(new URL("/login?error=verification",origin));
 return response;
}
