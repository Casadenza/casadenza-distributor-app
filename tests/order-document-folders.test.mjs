import test from "node:test";
import assert from "node:assert/strict";
import {documentFolder,orderValue,orderCurrency,groupOrderDocuments,filterFolderOrders,INITIAL_FOLDER_FILTERS} from "../lib/order-document-folders.ts";

const docs=[
{id:"1",title:"Purchase Order 175 sheets"},{id:"2",title:"PI 2026"},{id:"3",title:"Commercial Invoice CST-26-27-25"},
{id:"4",title:"Packing List - Dubai"},{id:"5",title:"Shipping Bill SB1828"},
{id:"6",title:"HAWB 987"},{id:"7",title:"Bill of Lading"},
{id:"8",title:"Product Brochure"}
];
const orders=[
{id:"wow",createdAt:"2026-11-08T10:00:00Z",status:"SHIPPED",notes:JSON.stringify({poNumber:"WF-175"}),
 distributor:{name:"Wow Factor",defaultCurrency:"USD"},items:[{qty:175,unitPrice:15}],documents:docs},
{id:"uk",createdAt:"2026-10-08T10:00:00Z",status:"RECEIVED",notes:JSON.stringify({poNumber:"UK-125"}),
 distributor:{name:"UK Materials",defaultCurrency:"GBP"},items:[{qty:125,unitPrice:12}],documents:[]},
{id:"old",createdAt:"2026-09-08T10:00:00Z",status:"DELIVERED",notes:JSON.stringify({poNumber:"WF-125"}),
 distributor:{name:"Wow Factor",defaultCurrency:"USD"},items:[{qty:125,unitPrice:10}],documents:[{id:"d",title:"Invoice 125"}]}
];
function filter(f){return filterFolderOrders(orders,{...INITIAL_FOLDER_FILTERS,...f});}
test("purchase order classification",()=>assert.equal(documentFolder(docs[0]),"ORDER"));
test("PI classification",()=>assert.equal(documentFolder(docs[1]),"PI"));
test("commercial invoice classification",()=>assert.equal(documentFolder(docs[2]),"INVOICE"));
test("packing list classification",()=>assert.equal(documentFolder(docs[3]),"PACKING"));
test("SB classification",()=>assert.equal(documentFolder(docs[4]),"SB"));
test("HAWB classification",()=>assert.equal(documentFolder(docs[5]),"AIR"));
test("bill of lading classification",()=>assert.equal(documentFolder(docs[6]),"SEA"));
test("unrelated document in other folder",()=>assert.equal(documentFolder(docs[7]),"OTHER"));
test("all files grouped exactly once",()=>{
 const groups=groupOrderDocuments(docs);assert.equal(groups.flatMap(x=>x.documents).length,docs.length);
 assert.equal(new Set(groups.flatMap(x=>x.documents.map(d=>d.id))).size,docs.length);
});
test("order value calculated from order line prices",()=>assert.equal(orderValue(orders[0]),2625));
test("currency is from distributor pricing denomination, not country",()=>assert.equal(orderCurrency(orders[0]),"USD"));
test("date lower/upper inclusive filters",()=>assert.deepEqual(filter({dateFrom:"2026-11-08",dateTo:"2026-11-08"}).map(x=>x.id),["wow"]));
test("numeric minimum and maximum value filter",()=>assert.deepEqual(filter({currency:"USD",minValue:"2000",maxValue:"2700"}).map(x=>x.id),["wow"]));
test("filter by document folder",()=>assert.deepEqual(filter({docType:"PACKING"}).map(x=>x.id),["wow"]));
test("orders with documents excludes empty folder",()=>assert.deepEqual(filter({onlyWithDocs:true}).map(x=>x.id),["wow","old"]));
test("status filter applies exactly",()=>assert.deepEqual(filter({status:"RECEIVED"}).map(x=>x.id),["uk"]));
test("search by PO and customer name",()=>assert.deepEqual(filter({query:"WF-175"}).map(x=>x.id),["wow"]));
test("value sort groups currencies before comparing amounts",()=>assert.deepEqual(filter({sort:"value-high"}).map(x=>x.id),["uk","wow","old"]));
test("malformed notes do not crash",()=>assert.deepEqual(filterFolderOrders([{...orders[0],notes:"{invalid"}],INITIAL_FOLDER_FILTERS).map(x=>x.id),["wow"]));
test("no price or currency defaults safely",()=>assert.equal(orderValue({id:"x",createdAt:"2026-11-01"}),0));
