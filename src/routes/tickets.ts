// src/routes/tickets.ts
import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { db, tickets, units, users } from "../db";
import { eq, and,sql,desc } from "drizzle-orm";

export const ticketRouter = Router();

// Raise ticket (employee + admin)

ticketRouter.post("/", requireAuth, async (req, res) => {
  try {
    console.log("Incoming Ticket Body:", req.body);

    const {
      title,
      description,
      priority,
      category,
      Floor,
      Room,
      Bed,
      department,
      unitId,
    } = req.body;

    // Validate required fields
    if (!title) return res.status(400).json({ message: "Title is required" });
    if (!category) return res.status(400).json({ message: "Category is required" });
    if (!description) return res.status(400).json({ message: "Description is required" });
   
    if (!department) return res.status(400).json({ message: "Department is required" });

    const user = req.user!;
    let finalUnitId: number;

    // EMPLOYEE → use their assigned unit
    if (user.role === "employee") {
      if (!user.unitId)
        return res.status(400).json({ message: "Employee has no assigned unit" });

      finalUnitId = user.unitId;
    }

    // ADMIN → must send unitId from frontend
    else {
      if (!unitId)
        return res.status(400).json({ message: "Admin must provide unitId" });

      finalUnitId = Number(unitId);
    }
    
    const normalizedPriority = priority?.toLowerCase();
    const finalPriority =
      normalizedPriority === "critical" ? "high" : normalizedPriority || "medium";

    // Insert into DB
    const inserted = await db
      .insert(tickets)
      .values({
        title,
        description,
        category,
        priority: finalPriority,
        department,
        // system-controlled
        
        floor: Floor || null,
        room: Room || null,
        bed: Bed || null,
        status: "Pending",

        unitId: finalUnitId,
        equipmentId:  null,

        createdById: user.id,
        assignedToName: null,
        assignedToId: null,
      })
      .returning();

    return res.status(201).json({ ticket: inserted[0] });

  } catch (e) {
    console.error("CREATE TICKET ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});




/* ------------------ DASHBOARD COUNTS ------------------ */
// ticketRouter.get("/count", requireAuth, async (req, res) => {
//   try {
//     const user = req.user!;

//     const baseWhere =
//       user.role === "admin"
//         ? undefined
//         : user.unitId
//         ? eq(tickets.unitId, user.unitId)
//         : undefined;

//     if (!baseWhere && user.role !== "admin") {
//       return res.json({
//         total: 0,
//         pending: 0,
//         inProgress: 0,
//         resolved: 0,
//       });
//     }

//     const [total] = await db
//       .select({ count: sql<number>`count(*)` })
//       .from(tickets)
//       .where(baseWhere);

//     const [pending] = await db
//       .select({ count: sql<number>`count(*)` })
//       .from(tickets)
//       .where(
//         baseWhere
//           ? and(baseWhere, eq(tickets.status, "pending"))
//           : eq(tickets.status, "pending")
//       );

//     const [inProgress] = await db
//       .select({ count: sql<number>`count(*)` })
//       .from(tickets)
//       .where(
//         baseWhere
//           ? and(baseWhere, eq(tickets.status, "in_progress"))
//           : eq(tickets.status, "in_progress")
//       );

//     const [resolved] = await db
//       .select({ count: sql<number>`count(*)` })
//       .from(tickets)
//       .where(
//         baseWhere
//           ? and(baseWhere, eq(tickets.status, "resolved"))
//           : eq(tickets.status, "resolved")
//       );

//     return res.json({
//       total: Number(total.count),
//       pending: Number(pending.count),
//       inProgress: Number(inProgress.count),
//       resolved: Number(resolved.count),
//     });
//   } catch (e) {
//     console.error("COUNT ERROR:", e);
//     return res.status(500).json({ message: "Server error" });
//   }
// });

/* ------------------ GET ALL TICKETS ------------------ */

// ticketRouter.get("/", requireAuth, async (req, res) => {
//   try {
//     const user = req.user!;
//     // const queryUnitId = req.query.unitId
//     //   ? Number(req.query.unitId)
//     //   : null;
//    // const  unitId  = req.query;
   
// const unitId = Number(user.unitId);
//     let rows;
//     if (!user.unitId || isNaN(Number(user.unitId))) {
//   return res.json({ tickets: [] });
// }

//     if (user.role !== "admin" && user.unitId !== null && Number.isNaN(Number(user.unitId))) {
    
//       rows = await db
//         .select({
//           id: tickets.id,
//           title: tickets.title,
//           description: tickets.description,
//           category: tickets.category,
//           priority: tickets.priority,
//           status: tickets.status,
//           department: tickets.department,
//           unitId: tickets.unitId,
//           createdAt: tickets.createdAt,

//           // 👇 THIS IS THE KEY
//           createdBy: users.name,
//           assignedTo: tickets.assignedToName,
//         })
//         .from(tickets)
//         .leftJoin(users, eq(tickets.createdById, users.id))
//         .where(eq(tickets.unitId, Number(unitId)))
//         .orderBy(desc(tickets.createdAt));
//     } else {
//       if (!user.unitId) return res.json({ tickets: [] });

//       rows = await db
//         .select({
//           id: tickets.id,
//           title: tickets.title,
//           description: tickets.description,
//           category: tickets.category,
//           priority: tickets.priority,
//           status: tickets.status,
//           department: tickets.department,
//           unitId: tickets.unitId,
//           createdAt: tickets.createdAt,

//           createdBy: users.name,
//           assignedTo: tickets.assignedToName,
//         })
//         .from(tickets)
//         .leftJoin(users, eq(tickets.createdById, users.id))
//         .where(eq(tickets.unitId, user.unitId))
//         .orderBy(desc(tickets.createdAt));
//     }

//     return res.json({ tickets: rows });
//   } catch (e) {
//     console.error("FETCH ERROR:", e);
//     return res.status(500).json({ message: "Server error" });
//   }
// });
ticketRouter.get(
  "/unit/:unitId",
  requireAuth,
  async (req, res) => {
    try {
      const user = req.user!;
      const unitId = Number(req.params.unitId);

      if (isNaN(unitId)) {
        return res.status(400).json({ message: "Invalid unitId" });
      }

      // 🔐 EMPLOYEE SAFETY CHECK
      if (user.role !== "admin" && user.unitId !== unitId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const rows = await db
        .select({
          id: tickets.id,
          title: tickets.title,
          description: tickets.description,
          category: tickets.category,
          priority: tickets.priority,
          status: tickets.status,
          department: tickets.department,
          unitId: tickets.unitId,
          createdAt: tickets.createdAt,
          createdBy: users.name,
          assignedTo: tickets.assignedToName,
        })
        .from(tickets)
        .leftJoin(users, eq(tickets.createdById, users.id))
        .where(eq(tickets.unitId, unitId))
        .orderBy(desc(tickets.createdAt));

      return res.json({ tickets: rows });
    } catch (e) {
      console.error("FETCH ERROR:", e);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

/* ------------------ PENDING (ADMIN REVIEW) ------------------ */
ticketRouter.get("/pending", requireAuth, requireAdmin, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(tickets)
      .where(eq(tickets.status, "Pending"));

    return res.json({ tickets: rows });
  } catch (e) {
    console.error("PENDING ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// ------------------ UPDATE TICKET ------------------
// ticketRouter.patch("/:id", requireAuth, async (req, res) => {
//   try {
//     const ticketId = Number(req.params.id);
//     const user = req.user!;

//     const {
//       status,
//       priority,
//       category,
//       assignedTo,
//     } = req.body as {
//       status?: string;
//       priority?: string;
//       category?: string;
//       assignedTo?: string | null;
//     };

//     // 🔒 Fetch ticket
//     const existing = await db
//       .select()
//       .from(tickets)
//       .where(eq(tickets.id, ticketId));

//     if (!existing[0]) {
//       return res.status(404).json({ message: "Ticket not found" });
//     }

//     const ticket = existing[0];

//     // 🔐 UNIT ACCESS CHECK
//     if (user.role !== "admin" && user.unitId !== ticket.unitId) {
//       return res.status(403).json({ message: "Unauthorized" });
//     }

//     let assignedToId: number | null = null;
//     let assignedToName: string | null = null;

//     if (assignedTo && assignedTo.trim() !== "") {
//       const foundUser = await db
//         .select()
//         .from(users)
//         .where(eq(users.name, assignedTo));

//       if (foundUser[0]) {
//         assignedToId = foundUser[0].id;
//         assignedToName = null;
//       } else {
//         assignedToName = assignedTo;
//       }
//     }

//     const updated = await db
//       .update(tickets)
//       .set({
//         status: status ?? ticket.status,
//         priority: priority ?? ticket.priority,
//         category: category ?? ticket.category,
//         assignedToId,
//         assignedToName,
//         updatedAt: new Date(),
//       })
//       .where(eq(tickets.id, ticketId))
//       .returning();

//     return res.json({ ticket: updated[0] });

//   } catch (e) {
//     console.error("UPDATE TICKET ERROR:", e);
//     return res.status(500).json({ message: "Server error" });
//   }
// });
ticketRouter.patch("/:id", requireAuth, async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const user = req.user!;

    const { status, priority, category, assignedTo } = req.body;

    const existing = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId));

    if (!existing[0]) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const ticket = existing[0];

    if (user.role !== "admin" && user.unitId !== ticket.unitId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // ✅ SAFE STATUS CAST
    const VALID_STATUSES = [
      "Open",
      "In Progress",
      "Pending",
      "Resolved",
      "Closed",
    ] as const;

    type TicketStatus = (typeof VALID_STATUSES)[number];

    const safeStatus: TicketStatus | undefined =
      status && VALID_STATUSES.includes(status as TicketStatus)
        ? (status as TicketStatus)
        : undefined;

    let assignedToId: number | null = null;
    let assignedToName: string | null = null;

    if (assignedTo && assignedTo.trim() !== "") {
      const foundUser = await db
        .select()
        .from(users)
        .where(eq(users.name, assignedTo));

      if (foundUser[0]) {
        assignedToId = foundUser[0].id;
      } else {
        assignedToName = assignedTo;
      }
    }

    const updated = await db
      .update(tickets)
      .set({
        status: safeStatus ?? ticket.status,
        priority: priority ?? ticket.priority,
        category: category ?? ticket.category,
        assignedToId,
        assignedToName,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId))
      .returning();

    return res.json({ ticket: updated[0] });
  } catch (e) {
    console.error("UPDATE ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});
ticketRouter.patch(
  "/:id/status",
  requireAuth,
  async (req, res) => {
    try {
      const ticketId = Number(req.params.id);
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const [updated] = await db
        .update(tickets)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, ticketId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      return res.json({ ticket: updated });
    } catch (e) {
      console.error("STATUS UPDATE ERROR:", e);
      return res.status(500).json({ message: "Server error" });
    }
  }
);
