import React from 'react'
import React, {useState} from "react";

const index = () => {
    const [orderid,setorderid] = useState();
    const [status,setstatus] = useState();
    const handlesubmit = (e)=>{
        e.preventDefault();
    }

    const data = ()=>{

    }

    

  return (
    <div className="conntainer">
        <div className="form">
        <h1>Order Status Manipulation</h1>
        <form action="" onSubmit={handlesubmit}>
            <div className="input">
            <label for="status">Order Manipulation</label>
            <input type="number" name="orderid" id="" value={orderid} onChange={(e)=>setorderid(e.target.value)}/>
            </div>
            <select name="status" id="status" value={status}  onChange={(e)=>setstatus(e.target.value)}>
                <option value="Placed">Orderd</option>
                <option value="Shipped">Shipped</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
            </select>
            <div></div>
            <button type="submit" id="btn" onClick={()=>{data()}}>Change Status</button>
        </form>
        </div>
    </div>    
  );
}

export default index