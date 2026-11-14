import test from "node:test";
import assert from "node:assert/strict";
import {EMPTY_SHIPMENT,parseShipment,carrierTrackingLink,parseForwarderReport} from "../lib/order-shipment.ts";
test("unset shipment shows pending details",()=>assert.equal(parseShipment(null).carrier,"UNKNOWN"));
test("carrier tracking URL restricted to verified carrier",()=>assert.equal(carrierTrackingLink("UNKNOWN","8917897601"),null));
test("DHL tracking opens official DHL domain",()=>assert.ok(carrierTrackingLink("DHL","8917897601").startsWith("https://www.dhl.com/")));
test("FedEx tracking opens official FedEx domain",()=>assert.ok(carrierTrackingLink("FEDEX","987654321012").startsWith("https://www.fedex.com/")));
test("UPS tracking opens official UPS domain",()=>assert.ok(carrierTrackingLink("UPS","1Z999AA10123456784").startsWith("https://www.ups.com/")));
test("Aramex tracking opens official Aramex domain",()=>assert.ok(carrierTrackingLink("ARAMEX","33123456789").startsWith("https://www.aramex.com/")));
test("missing tracking number produces no link",()=>assert.equal(carrierTrackingLink("DHL",""),null));
test("malicious tracking identifier cannot become an external URL",()=>assert.equal(carrierTrackingLink("DHL","javascript:alert(1)"),null));
test("forwarder is not assumed DHL carrier",()=>{
 const x=parseForwarderReport("Rohit <rohit@orangestar.co.in>","RE: Export Australia 1 pallet // RD02","Shipment booked. AWB No 9011223344");
 assert.equal(x.carrier,"UNKNOWN");assert.equal(x.agent,"Orangestar Logistics");
});
test("unrelated domains cannot masquerade as Orangestar",()=>{
 assert.equal(parseForwarderReport("fraud@orangestar.co.in.evil.com","Shipping report","ETD 08-NOV-26"),null);
});
test("identifies Orangestar booking reference",()=>{
 const x=parseForwarderReport("seafreight1@orangestar.co.in","RE: Export Australia 1 pallet // RD02","Cargo stuffing done");
 assert.equal(x.booking,"RD02");
});
test("extracts sailed milestone and Singapore ETA without claiming Melbourne delivered",()=>{
 const body="Dear Sir,\nShipment has been Sailed.\nOnBoard Date\n08-NOV-26\nMother Vessel\nKOTA PRIMROSE - 19E\nEta SINGAPORE\n22-NOV-26\n\nFrom: prior message\nETD NHAVA SHEVA\n09-NOV-26";
 const x=parseForwarderReport("seafreight1@orangestar.co.in","RE: Sea DOCS Export Australia 1 pallet // RD02",body);
 assert.equal(x.status,"SAILED");assert.equal(x.etd,"08-NOV-26");assert.equal(x.eta,"22-NOV-26");assert.equal(x.etaLocation,"SINGAPORE");
});
test("quoted history cannot override latest milestone",()=>{
 const x=parseForwarderReport("seafreight1@orangestar.co.in","Export Australia // RD02","ETA SINGAPORE\n22-NOV-26\nFrom: old\nETA SINGAPORE\n21-NOV-26");
 assert.equal(x.eta,"22-NOV-26");
});
test("email-only updates do not invent courier tracking",()=>{
 const x=parseForwarderReport("exports@orangestar.co.in","Export Japan // AE260078","HAWB attached. Cargo received");
 assert.equal(x.trackingNumber,"");assert.equal(x.carrier,"UNKNOWN");
});
test("stored shipment metadata keeps all relevant values",()=>{
 const o=parseShipment(JSON.stringify({poNumber:"WF175",shipment:{agent:"Orangestar Logistics",carrier:"DHL",trackingNumber:"8917897601",etd:"2026-11-08",eta:"2026-11-22"}}));
 assert.equal(o.agent,"Orangestar Logistics");assert.equal(o.etd,"2026-11-08");assert.equal(o.trackingNumber,"8917897601");
});
test("invalid existing carrier safely resolves UNKNOWN",()=>{
 const o=parseShipment(JSON.stringify({shipment:{carrier:"SCAM",trackingNumber:"1111111"}}));
 assert.equal(o.carrier,"UNKNOWN");
});
