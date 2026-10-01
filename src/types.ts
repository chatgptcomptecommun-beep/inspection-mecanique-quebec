export type ResultState='ok'|'watch'|'repair'|'unchecked'|'na';
export type InspectionStatus='draft'|'completed'|'cancelled';
export interface MechanicProfile{firstName:string;lastName:string;company?:string;email:string}
export interface Client{id?:string;firstName:string;lastName:string;phone?:string;email?:string;address?:string}
export interface Vehicle{id?:string;make:string;model:string;year:number;plate:string;province:string;vin:string;mileage:number;color?:string;type:string;fuel?:string}
export interface ChecklistItem{id:string;label:string;critical?:boolean;measurement?:string}
export interface ChecklistSection{id:string;title:string;items:ChecklistItem[]}
export interface ItemResult{itemId:string;state:ResultState;note?:string;measurement?:string}
export interface InspectionPhoto{id:string;key:string;itemId:string;mimeType:string;name:string}
export interface Inspection{id:string;reportNumber:string;status:InspectionStatus;date:string;reason:string;client:Client;vehicle:Vehicle;results:Record<string,ItemResult>;photos?:InspectionPhoto[];recommendations:string;nextVisitDate?:string;nextVisitMileage?:number;createdAt:string;updatedAt:string}

