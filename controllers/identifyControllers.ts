const { PrismaClient } = require('@prisma/client');
import { Request, Response } from 'express';
const prisma = new PrismaClient();

enum LinkPrecedence {
    primary,
    secondary
}

const newPrimaryContact = async (email: String, phoneNumber: String) => {
    const contact = await prisma.contact.create({
        data: {
            email: email,
            phoneNumber: phoneNumber,
            linkPrecedence: LinkPrecedence.primary
        },
    });
    return contact.id;
}

const returnId = async (email: String, phoneNumber: String) => {

    if (!email) {
        const contact = await prisma.contact.findUnique({
            where: {
                phoneNumber: phoneNumber
            }
        });
        if (contact) {
            return contact.id
        }
        else {
            const contactId = await newPrimaryContact(email, phoneNumber);
            return contactId
        }
    }

    if (!phoneNumber) {
        const contact = await prisma.contact.findUnique({
            where: {
                email: email
            }
        });
        if (contact) {
            return contact.id;
        }
        else {
            const contactId = await newPrimaryContact(email, phoneNumber);
            return contactId;
        }
    }

    const contact = await prisma.contact.findUnique({
        where: {
            AND: [
                { email: email },
                { phoneNumber: phoneNumber }
            ]
        }
    });

    if (contact) {
        return contact.id;
    }

    const contact1 = await prisma.contact.findUnique({
        where: {
            email: email
        }
    });

    const contact2 = await prisma.contact.findUnique({
        where: {
            phoneNumber: phoneNumber
        }
    });

    if (!contact1 && !contact2) {
        const contactId = await newPrimaryContact(email, phoneNumber);
        return contactId;
    }

    if (!contact1 && contact2) {
        const linkedId = contact2.linkPrecendence == LinkPrecedence.primary ? contact2.id : contact2.linkedId;
        const contactEntry = await prisma.contact.create({
            data: {
                email: email,
                phoneNumber: phoneNumber,
                linkedId: linkedId,
                linkPrecedence: LinkPrecedence.secondary
            }
        })
        return contactEntry.linkedId;
    }

    if (contact1 && !contact2) {
        const linkedId = contact1.linkPrecendence == LinkPrecedence.primary ? contact1.id : contact1.linkedId;
        const contactEntry = await prisma.contact.create({
            data: {
                email: email,
                phoneNumber: phoneNumber,
                linkedId: linkedId,
                linkPrecedence: LinkPrecedence.secondary
            }
        })
        return contactEntry.linkedId;
    }

    // match 2 different contacts
    else {
        if(contact1.linkPrecedence == LinkPrecedence.primary && contact2.linkPrecedence == LinkPrecedence.primary) {
            if (contact1.createdAt < contact2.createdAt) {
                await prisma.contact.updateMany({
                    where: {
                        OR: [
                            { id: contact2.id },
                            { linkedId: contact2.id }
                        ]
                    },
                    data: {
                        linkedId: contact1.id,
                        linkPrecedence: LinkPrecedence.secondary
                    },
                })
                const contactEntry = await prisma.contact.create({
                    data: {
                        email: email,
                        phoneNumber: phoneNumber,
                        linkedId: contact1.id,
                        linkPrecedence: LinkPrecedence.secondary
                    }
                })
                return contactEntry.linkedId;
            }
            else {
                await prisma.contact.updateMany({
                    where: {
                        OR: [
                            { id: contact1.id },
                            { linkedId: contact1.id }
                        ]
                    },
                    data: {
                        linkedId: contact2.id,
                        linkPrecedence: LinkPrecedence.secondary
                    },
                })
                const contactEntry = await prisma.contact.create({
                    data: {
                        email: email,
                        phoneNumber: phoneNumber,
                        linkedId: contact2.id,
                        linkPrecedence: LinkPrecedence.secondary
                    }
                })
                return contactEntry.linkedId;
            }
        }
        else if(contact1.linkPrecedence == LinkPrecedence.secondary && contact2.linkPrecedence == LinkPrecedence.secondary) {
            if (contact1.linkedId == contact2.linkedId){
                const contactEntry = await prisma.contact.create({
                    data: {
                        email: email,
                        phoneNumber: phoneNumber,
                        linkedId: contact1.linkedId,
                        linkPrecedence: LinkPrecedence.secondary
                    }
                })
                return contactEntry.linkedId;
            }
            const primaryContact1 = await prisma.contact.findUnique({
                where: {
                    id: contact1.linkedId
                }
            });
            const primaryContact2 = await prisma.contact.findUnique({
                where: {
                    id: contact2.linkedId
                }
            });
            if(primaryContact1.createdAt < primaryContact2.createdAt) {
                await prisma.contact.updateMany({
                    where: {
                        OR: [
                            { id: primaryContact2.id },
                            { linkedId: primaryContact2.id }
                        ]
                    },
                    data: {
                        linkedId: primaryContact1.id,
                        linkPrecedence: LinkPrecedence.secondary
                    },
                })
                const contactEntry = await prisma.contact.create({
                    data: {
                        email: email,
                        phoneNumber: phoneNumber,
                        linkedId: primaryContact1.id,
                        linkPrecedence: LinkPrecedence.secondary
                    }
                })
                return contactEntry.linkedId;
            }
            else {
                await prisma.contact.updateMany({
                    where: {
                        OR: [
                            { id: primaryContact1.id },
                            { linkedId: primaryContact1.id }
                        ]
                    },
                    data: {
                        linkedId: primaryContact2.id,
                        linkPrecedence: LinkPrecedence.secondary
                    },
                })
                const contactEntry = await prisma.contact.create({
                    data: {
                        email: email,
                        phoneNumber: phoneNumber,
                        linkedId: primaryContact2.id,
                        linkPrecedence: LinkPrecedence.secondary
                    }
                })
                return contactEntry.linkedId;
            }
        }
        else {
            const primaryContact = contact1.linkPrecedence == LinkPrecedence.primary ? contact1 : contact2;
            const secondaryContact = contact1.linkPrecedence == LinkPrecedence.secondary ? contact1 : contact2;
            if (secondaryContact.linkedId == primaryContact.id) {
                const contactEntry = await prisma.contact.create({
                    data: {
                        email: email,
                        phoneNumber: phoneNumber,
                        linkedId: primaryContact.id,
                        linkPrecedence: LinkPrecedence.secondary
                    }
                });
                return contactEntry.linkedId;
            }
            else {
                const anotherPrimaryContact = await prisma.contact.findUnique({
                    where: {
                        id: secondaryContact.linkedId
                    }
                })
                if (anotherPrimaryContact.createdAt < primaryContact.createdAt) {
                    await prisma.contact.updateMany({
                        where: {
                            OR: [
                                { id: primaryContact.id },
                                { linkedId: primaryContact.id }
                            ]
                        },
                        data: {
                            linkedId: anotherPrimaryContact.id,
                            linkPrecedence: LinkPrecedence.secondary
                        },
                    })
                    const contactEntry = await prisma.contact.create({
                        data: {
                            email: email,
                            phoneNumber: phoneNumber,
                            linkedId: anotherPrimaryContact.id,
                            linkPrecedence: LinkPrecedence.secondary
                        }
                    })
                    return contactEntry.linkedId;
                }
                else {
                    await prisma.contact.updateMany({
                        where: {
                            OR: [
                                { id: anotherPrimaryContact.id },
                                { linkedId: anotherPrimaryContact.id }
                            ]
                        },
                        data: {
                            linkedId: primaryContact.id,
                            linkPrecedence: LinkPrecedence.secondary
                        },
                    })
                    const contactEntry = await prisma.contact.create({
                        data: {
                            email: email,
                            phoneNumber: phoneNumber,
                            linkedId: primaryContact.id,
                            linkPrecedence: LinkPrecedence.secondary
                        }
                    })
                    return contactEntry.linkedId;
                }
            }
        }
    }
};

const identify = async (req: Request, res: Response) => {

    const { email, phoneNumber } = req.body;
    const contactId = await returnId(email, phoneNumber);
    const primaryContact = prisma.contact.findUnique({
        where: {
            id: contactId
        }
    });
    const linkedContacts = prisma.contact.findMany({
        where: {
            linkedId: contactId
        }
    });
    const emails = primaryContact.email;
    const phoneNumbers = primaryContact.phoneNumber;
    const secondaryContactIds: number[] = [];
    linkedContacts.forEach((contact: { email: string; phoneNumber: string; id: number }) => {
        emails.push(contact.email);
        phoneNumbers.push(contact.phoneNumber);
        secondaryContactIds.push(contact.id);
    });
    res.json({
        contact: {
            primaryContactId: contactId,
            emails: emails,
            phoneNumbers: phoneNumbers,
            secondaryContactIds: secondaryContactIds
        }
    })
}