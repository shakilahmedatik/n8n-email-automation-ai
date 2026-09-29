import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env.local"), override: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in the environment variables.");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding dashboard with demo data...\n");

  // ─── Demo Messages ─────────────────────────────────────────────────────────
  const messages = [
    {
      senderName: "Sarah Johnson",
      senderEmail: "sarah.johnson@acmecorp.com",
      subject: "Enterprise Quote Request — 50 Seats",
      body: "Hi team,\n\nWe would like to get a formal price quote for 50 enterprise seats with annual contract terms. Can you also include volume discount pricing for 100+ seats?\n\nPlease send the proposal by end of this week.\n\nBest regards,\nSarah Johnson\nVP of Operations, Acme Corp",
      classification: "HUMAN_APPROVAL" as const,
      priority: "High" as const,
      status: "pending" as const,
      aiReason: "Involves pricing, contract terms, and volume discounts — requires mandatory human review",
      aiSummary: "Enterprise client requesting formal pricing proposal for 50-100+ seats with annual contract",
      aiDraftResponse: "Dear Sarah,\n\nThank you for reaching out regarding enterprise pricing. We're excited about the opportunity to work with Acme Corp.\n\nI've forwarded your request to our enterprise sales team, who will prepare a detailed proposal including:\n- Pricing for 50 seats\n- Volume discount tiers for 100+ seats\n- Annual contract terms and conditions\n\nYou can expect to receive the proposal within 2 business days.\n\nBest regards,\nAtik & The Automation Team",
      gmailMessageId: "msg_001",
      gmailThreadId: "thread_001",
    },
    {
      senderName: "Michael Chen",
      senderEmail: "m.chen@techstart.io",
      subject: "Urgent: Service Outage Affecting Our Dashboard",
      body: "Hello,\n\nWe're experiencing a critical service outage on our dashboard since 2:30 PM today. Our entire team of 25 people is unable to access the platform. This is severely impacting our operations.\n\nPlease escalate this immediately.\n\nMichael Chen\nCTO, TechStart.io",
      classification: "HUMAN_APPROVAL" as const,
      priority: "High" as const,
      status: "pending" as const,
      aiReason: "Critical complaint/escalation from client reporting service outage — requires immediate human attention",
      aiSummary: "CTO reporting critical platform outage affecting 25-person team, requesting immediate escalation",
      aiDraftResponse: "Dear Michael,\n\nThank you for bringing this to our attention immediately. We understand the urgency and severity of this situation.\n\nOur technical team has been alerted and is investigating the dashboard outage as a top priority. We will provide you with an initial status update within the next 30 minutes.\n\nIn the meantime, if you need immediate assistance, please don't hesitate to reach out to our support line.\n\nBest regards,\nAtik & The Automation Team",
      gmailMessageId: "msg_002",
      gmailThreadId: "thread_002",
    },
    {
      senderName: "Emily Rodriguez",
      senderEmail: "emily.r@designstudio.com",
      subject: "Partnership Opportunity — Joint Webinar Series",
      body: "Hi there,\n\nI'm Emily from Design Studio. We've been following your work in AI automation and would love to explore a partnership opportunity.\n\nWe're planning a webinar series on 'AI in Business Operations' and think a joint collaboration would be mutually beneficial. Would you be interested in co-hosting 3 sessions with us?\n\nLooking forward to discussing this further.\n\nBest,\nEmily Rodriguez\nHead of Partnerships",
      classification: "HUMAN_APPROVAL" as const,
      priority: "Medium" as const,
      status: "pending" as const,
      aiReason: "Business partnership and collaboration proposal — requires human judgment on strategic decisions",
      aiSummary: "Partnership proposal for co-hosting AI webinar series from Design Studio",
      aiDraftResponse: "Dear Emily,\n\nThank you for reaching out with this exciting partnership opportunity! We're always interested in collaborating with like-minded organizations.\n\nThe joint webinar series on 'AI in Business Operations' sounds like a great fit for our expertise. I'd love to learn more about:\n- The proposed timeline and topics\n- Expected audience size and demographics\n- How the responsibilities would be shared\n\nCould we schedule a 30-minute call this week to discuss the details?\n\nBest regards,\nAtik & The Automation Team",
      gmailMessageId: "msg_003",
      gmailThreadId: "thread_003",
    },
    {
      senderName: "David Park",
      senderEmail: "david@clientco.com",
      subject: "What are your office hours?",
      body: "Hello,\n\nQuick question — what are your office hours? I want to call in tomorrow.\n\nThanks,\nDavid",
      classification: "AUTO_REPLY" as const,
      priority: "Low" as const,
      status: "auto_sent" as const,
      aiReason: "Routine FAQ about office hours — safe for automated response",
      aiSummary: "Client asking about office hours for a phone call",
      aiDraftResponse: "Hi David,\n\nThank you for reaching out! Our office hours are Monday to Friday, 9:00 AM – 6:00 PM (GMT+6). We are closed on Saturday and Sunday.\n\nFeel free to call us anytime during business hours. We look forward to hearing from you!\n\nBest regards,\nAtik & The Automation Team",
      finalResponse: "Hi David,\n\nThank you for reaching out! Our office hours are Monday to Friday, 9:00 AM – 6:00 PM (GMT+6). We are closed on Saturday and Sunday.\n\nFeel free to call us anytime during business hours. We look forward to hearing from you!\n\nBest regards,\nAtik & The Automation Team",
      gmailMessageId: "msg_004",
      gmailThreadId: "thread_004",
    },
    {
      senderName: "Lisa Wang",
      senderEmail: "l.wang@bigcorp.com",
      subject: "Requesting Full Refund — Invoice #4421",
      body: "To whom it may concern,\n\nI'm writing to formally request a full refund for Invoice #4421 dated August 15th. The services delivered did not meet the agreed-upon specifications outlined in our contract.\n\nPlease process the refund within 5 business days or I will be forced to escalate this matter.\n\nLisa Wang\nProcurement Manager, BigCorp",
      classification: "HUMAN_APPROVAL" as const,
      priority: "High" as const,
      status: "approved" as const,
      aiReason: "Refund demand with contractual dispute implications — requires mandatory human review",
      aiSummary: "Formal refund request for Invoice #4421 citing contract specifications not met, with escalation threat",
      aiDraftResponse: "Dear Lisa,\n\nThank you for bringing this matter to our attention. We take all service quality concerns seriously.\n\nI've escalated your refund request for Invoice #4421 to our finance and accounts team for immediate review. We will investigate the service delivery against the agreed specifications.\n\nYou can expect a detailed response within 2 business days.\n\nBest regards,\nAtik & The Automation Team",
      finalResponse: "Dear Lisa,\n\nThank you for bringing this to our attention. I've personally reviewed Invoice #4421 and the associated service delivery.\n\nI've initiated the refund process and you should see the credit within 3-5 business days. Additionally, I'd like to schedule a call to discuss how we can better serve BigCorp going forward.\n\nSincerely,\nAtik & The Automation Team",
      reviewedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      gmailMessageId: "msg_005",
      gmailThreadId: "thread_005",
    },
    {
      senderName: "Alex Thompson",
      senderEmail: "alex@startup.io",
      subject: "Where is your office located?",
      body: "Hey,\n\nI'll be visiting Dhaka next week. Where exactly is your office? I'd love to drop by.\n\nCheers,\nAlex",
      classification: "AUTO_REPLY" as const,
      priority: "Low" as const,
      status: "auto_sent" as const,
      aiReason: "Routine question about office location — can be answered with business profile info",
      aiSummary: "Visitor asking for office location in Dhaka",
      aiDraftResponse: "Hi Alex,\n\nGreat to hear you'll be visiting Dhaka! Our office is located in Dhaka, Bangladesh. Our team also operates globally and remotely.\n\nPlease feel free to reach out to us at support@atikautomation.com to arrange a meeting during your visit.\n\nBest regards,\nAtik & The Automation Team",
      finalResponse: "Hi Alex,\n\nGreat to hear you'll be visiting Dhaka! Our office is located in Dhaka, Bangladesh. Our team also operates globally and remotely.\n\nPlease feel free to reach out to us at support@atikautomation.com to arrange a meeting during your visit.\n\nBest regards,\nAtik & The Automation Team",
      gmailMessageId: "msg_006",
      gmailThreadId: "thread_006",
    },
    {
      senderName: "Newsletter Bot",
      senderEmail: "no-reply@techweekly.com",
      subject: "🔥 This Week in AI: GPT-6 Rumors, Apple Intelligence Update",
      body: "This Week in AI Newsletter\n\nTop Stories:\n1. GPT-6 rumored for Q1 release\n2. Apple Intelligence hits 500M users\n3. Google DeepMind breakthrough in protein folding\n\nClick here to unsubscribe",
      classification: "SPAM" as const,
      priority: "Low" as const,
      status: "spam" as const,
      aiReason: "Automated newsletter/marketing email — no response needed",
      aiSummary: "Tech newsletter with AI industry news roundup",
      aiDraftResponse: "",
      gmailMessageId: "msg_007",
      gmailThreadId: "thread_007",
    },
    {
      senderName: "Sales Bot",
      senderEmail: "outreach@spammy-saas.com",
      subject: "Boost your productivity 10x with our AI tool!",
      body: "Hi there!\n\nAre you tired of manual work? Our AMAZING AI tool can 10x your productivity!\n\nSpecial offer: 50% off for the first 100 customers!\n\nClick here to get started: https://definitely-not-spam.com\n\nBest,\nThe SpammySaaS Team",
      classification: "SPAM" as const,
      priority: "Low" as const,
      status: "spam" as const,
      aiReason: "Cold sales pitch with promotional language — classified as spam",
      aiSummary: "Unsolicited sales pitch from unknown SaaS company",
      aiDraftResponse: "",
      gmailMessageId: "msg_008",
      gmailThreadId: "thread_008",
    },
    {
      senderName: "Robert Kim",
      senderEmail: "r.kim@enterprise.com",
      subject: "NDA Review Request",
      body: "Dear Team,\n\nPlease find attached our standard NDA for your review. We need this signed before we can proceed with the technical evaluation.\n\nKindly review and return the signed copy by Friday.\n\nRegards,\nRobert Kim\nLegal Counsel",
      classification: "HUMAN_APPROVAL" as const,
      priority: "High" as const,
      status: "pending" as const,
      aiReason: "Legal document (NDA) requiring human review — mandatory approval needed",
      aiSummary: "Legal counsel requesting NDA review and signature before technical evaluation",
      aiDraftResponse: "Dear Robert,\n\nThank you for sending over the NDA. We have received the document and our team will review it promptly.\n\nWe aim to have our feedback and the signed copy returned to you before the Friday deadline. If we have any questions or proposed amendments, we will reach out directly.\n\nBest regards,\nAtik & The Automation Team",
      gmailMessageId: "msg_009",
      gmailThreadId: "thread_009",
    },
    {
      senderName: "Jane Smith",
      senderEmail: "jane@happycustomer.com",
      subject: "Re: Question about office hours",
      body: "Thank you for your response! That's very helpful.",
      classification: "NO_REPLY" as const,
      priority: "Low" as const,
      status: "ignored" as const,
      aiReason: "Simple acknowledgment that does not ask any new question — no reply needed",
      aiSummary: "Customer thanking for previous response about office hours",
      aiDraftResponse: "",
      gmailMessageId: "msg_010",
      gmailThreadId: "thread_004",
    },
  ];

  for (const msg of messages) {
    const message = await prisma.message.create({
      data: {
        ...msg,
        receivedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      },
    });

    // Create notifications
    if (msg.classification === "HUMAN_APPROVAL") {
      await prisma.notification.create({
        data: {
          type: "approval_needed",
          title: `Approval needed: ${msg.subject}`,
          body: `Message from ${msg.senderName} requires human review. Priority: ${msg.priority}`,
          messageId: message.id,
          isRead: msg.status !== "pending",
        },
      });
    } else if (msg.classification === "AUTO_REPLY") {
      await prisma.notification.create({
        data: {
          type: "auto_reply_sent",
          title: `Auto-reply sent: ${msg.subject}`,
          body: `AI automatically replied to ${msg.senderName}`,
          messageId: message.id,
          isRead: true,
        },
      });
    } else if (msg.classification === "SPAM") {
      await prisma.notification.create({
        data: {
          type: "new_spam",
          title: `Spam detected: ${msg.subject}`,
          body: `Message from ${msg.senderEmail} classified as spam`,
          messageId: message.id,
          isRead: true,
        },
      });
    }

    // Create activity log
    await prisma.activityLog.create({
      data: {
        action: `message_${msg.classification.toLowerCase()}`,
        messageId: message.id,
        details: {
          classification: msg.classification,
          priority: msg.priority,
          aiSummary: msg.aiSummary,
        },
      },
    });

    console.log(`  ✅ ${msg.classification.padEnd(16)} | ${msg.subject}`);
  }

  console.log(`\n🎉 Seeded ${messages.length} messages with notifications and activity logs!`);
  console.log("\n📌 Summary:");
  console.log("   • 4 Pending Approvals (High & Medium priority)");
  console.log("   • 1 Approved message");
  console.log("   • 2 Auto-replied messages");
  console.log("   • 2 Spam messages");
  console.log("   • 1 Ignored (no-reply) message");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
