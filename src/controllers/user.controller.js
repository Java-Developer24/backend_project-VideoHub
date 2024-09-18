import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"


const generateAcessAndRefreshTokens= async()=>{
    try {
        await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}
        
    } catch (error) {
        throw new ApiError(500,"something went wrong while generating access and refresh token")
        
    }
}

const registerUser=asyncHandler( async(req,res)=>{
    // res.status(200).json({
    //     message:"ok"
    // })

    const {fullName,email,username,password}=req.body
    console.log("email :",email);
    if (
        [fullName,email,username,password].some((fields)=>
        fields?.trim()=="")
    ) {
        throw new ApiError(400,"All fields are required")
    }
   const existedUser= await User.findOne({
        $or:[{username},{email}]
    })
    if (existedUser) {
        throw new ApiError(409,"user with email/username already existed")
    }
    console.log('req.files:', req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // console.log(avatarLocalPath)
    const coverImageLocalPath=req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400,"avatar file is required")
    }
    
   const avatar= await uploadOnCloudinary(avatarLocalPath)
   const coverImage= await uploadOnCloudinary(coverImageLocalPath)

   if (!avatar) {
    throw new ApiError(400,"avatar file is required")

   }
 const user= await User.create(
    {
        fullName,
        avatar:avatar.url,
        coverImage:coverImage.url||"",
        email,
        password,
        username:username.toLowerCase()
    }
   )

  const createdUser=await User.findById(user._id).select(
    "-password -refreshToken"
   )
   if (!createdUser) {
    throw new ApiError(500,"something went wrong while registering the user")
    
   }
  return res.status(201).json(
    new ApiResponse(200,createdUser,"User registred sucessfully")
  )
    
})

const loginUser=asyncHandler(async (req,res)=>{

    const {email,username,password}=req.body
    if (!username||!email) {
        throw new ApiError(400,"username or email is required")
        
    }
    const user= await User.findOne({
        $or:[{username},{email}]

    })
    if (!user) {
        throw new ApiError(404,"User doesnt exist")
        
    }
    const isPasswordValid=user.isPassword(password)

    if (!isPasswordValid) {
        throw new ApiError(401,"Password is incorrect")

        
    }
   const {accessToken,refreshToken}= await generateAcessAndRefreshTokens(user._id)
   const loggedInUser=await User.findById(_id).select("-password -refreshToken")


   const options={
    httpOnly :true,
    secure:true,
    //this allow the cookies to edit only on server side, not on front end side
   }

   return  res.
   status(200)
   .cookie("access token",accessToken,options)
   .cookie("refresh token",refreshToken,options)
   .json(
    new ApiResponse(200,{
        user:loggedInUser,accessToken,refreshToken
    },
"User logged in sucessfully"
)
   )

})
const logoutUser=asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user_id,
        {
            $set:{
                refreshToken:undefined
            },
            
        },
        {set:true}
    )

const options={
    httpOnly :true,
    secure:true,
    //this allow the cookies to edit only on server side, not on front end side
   }
   return res
   .status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(
    new ApiResponse(200,{},"User logged out")
   )
})

export {registerUser,
    loginUser,
    logoutUser

}