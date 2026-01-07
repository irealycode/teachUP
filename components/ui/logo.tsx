export default function Logo({scale=1}:{scale?:number}){
    return(
        <div className="flex items-center gap-2" style={{scale}}>
            
            <img src="/imgs/svgs/logo.svg" style={{height:25}} />
          </div>
    )
}