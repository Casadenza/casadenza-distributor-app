import test from "node:test";
import assert from "node:assert/strict";
import {documentReadiness,missingDocumentCount} from "../lib/order-document-completeness.ts";
const pdf=(title)=>({id:title,title,url:"https://example.com/"+encodeURIComponent(title)});
test("received email-only order is not incorrectly flagged missing PO PDF",()=>{
 const r=documentReadiness({status:"RECEIVED",documents:[]});assert.equal(r.state,"WAITING");assert.deepEqual(r.missing,[]);
});
test("confirmed order suggests PI",()=>{
 const r=documentReadiness({status:"CONFIRMED",documents:[]});assert.deepEqual(r.missing,["PI"]);assert.equal(r.state,"INCOMPLETE");
});
test("confirmed order with published PI passes initial document check",()=>{
 const r=documentReadiness({status:"PROCESSING",documents:[pdf("Proforma Invoice")]});assert.equal(r.state,"DOCUMENTS_PRESENT");
});
test("shipment requires core invoice and packing checklist",()=>{
 const r=documentReadiness({status:"SHIPPED",documents:[]});assert.deepEqual(r.missing,["INVOICE","PACKING"]);
});
test("shipped sea freight suggests BL, not air waybill",()=>{
 const r=documentReadiness({status:"DISPATCHED",notes:JSON.stringify({shipmentMode:"SEA"}),documents:[pdf("Commercial Invoice"),pdf("Packing List")]});
 assert.deepEqual(r.suggested,["SEA"]);assert.equal(r.state,"DOCUMENTS_PRESENT");
});
test("shipped air freight suggests AWB",()=>{
 const r=documentReadiness({status:"SHIPPED",notes:JSON.stringify({shippingMode:"AIR"}),documents:[pdf("Commercial Invoice")]});
 assert.deepEqual(r.suggested,["AIR"]);assert.deepEqual(r.missing,["PACKING"]);
});
test("unspecified transport mode marks transport docs as suggestions, not mandatory",()=>{
 const r=documentReadiness({status:"IN_TRANSIT",documents:[pdf("Commercial Invoice"),pdf("Packing List")]});
 assert.deepEqual(r.missing,[]);assert.deepEqual(r.suggested,["AIR","SEA"]);
});
test("documents with no URL are not counted published",()=>{
 const r=documentReadiness({status:"SHIPPED",documents:[{id:"1",title:"Commercial Invoice",url:null},pdf("Packing List")]});
 assert.deepEqual(r.missing,["INVOICE"]);
});
test("delivered order missing invoice is flagged but not auto-published",()=>{
 const r=documentReadiness({status:"DELIVERED",documents:[]});assert.equal(r.phase,"DELIVERED");assert.equal(r.state,"INCOMPLETE");
});
test("cancelled order has no expected documents",()=>{
 const r=documentReadiness({status:"CANCELLED",documents:[]});assert.equal(r.phase,"CLOSED");assert.deepEqual(r.missing,[]);
});
test("missing orders count only active checklist failures",()=>{
 const a=[{status:"RECEIVED",documents:[]},{status:"SHIPPED",documents:[]},{status:"DELIVERED",documents:[pdf("Commercial Invoice"),pdf("Packing List")]}];
 assert.equal(missingDocumentCount(a),1);
});
test("unknown stage is not mistakenly assumed shipped",()=>{
 const r=documentReadiness({status:"ON_HOLD",documents:[]});assert.equal(r.phase,"ORDER");
});
