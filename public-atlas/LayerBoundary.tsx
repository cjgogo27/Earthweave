import {Component,type ReactNode} from "react";
export default class LayerBoundary extends Component<{children:ReactNode;message:string;back:string;onBack:()=>void},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<div role="alert" className="layer-status"><p>{this.props.message}</p><button onClick={this.props.onBack}>{this.props.back}</button></div>:this.props.children;}
}
