export interface HistoryDate {start:number;end:number;label:string;basis?:string}
export interface HistoryRecord {
  slug:string; title:string; kind:'story'|'event'|'person'|'tradition'|'place';
  route:string; era:string; summary:string; date:HistoryDate|null;
  status:string; category:string; aliases:string[]; people:string[];
  traditions:string[]; places:string[]; century:number|null;
  headingLevel:number|null; source:string; textLength:number;
}
export interface BranchNode {slug:string;family:string;year:number}
export interface BranchEdge {from:string;to:string;type:string;label:string;source:string}
export interface BranchData {families:{id:string;title:string}[];nodes:BranchNode[];edges:BranchEdge[]}
export interface PreparedPage {route:string;title:string;body:string;description:string;current:string;era:string;header:string;footer:string;tools:string}
