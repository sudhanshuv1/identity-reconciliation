const { PrismaClient } = require('@prisma/client');
import { Request, Response } from 'express';
const prisma = new PrismaClient();



/*
    Return the ID of the primary contact to which the given contact can be linked
*/
const returnLinkedId = async (email: String, phoneNumber: String) => {

    // no email in the request
    if (!email) {
        const contact = await prisma.contact.findFirst({
            where: {
                phoneNumber: phoneNumber
            }
        });
        if (contact) {
            return contact.linkedId ? contact.linkedId : contact.id;
        }
        else {
            const contactId = await newPrimaryContact(email, phoneNumber);
            return contactId
        }
    }

    // no phone number in the request
    if (!phoneNumber) {
        const contact = await prisma.contact.findFirst({
            where: {
                email: email
            }
        });
        if (contact) {
            return contact.linkedId ? contact.linkedId : contact.id;
        }
        else {
            const contactId = await newPrimaryContact(email, phoneNumber);
            return contactId;
        }
    }

    // check for duplicate contact with same email and phone number
    const contact = await prisma.contact.findFirst({
        where: {
            AND: [
                { email: email },
                { phoneNumber: phoneNumber }
            ]
        }
    });

    if (contact) {
        return contact.linkedId ? contact.linkedId : contact.id;
    }

    const contact1 = await prisma.contact.findFirst({
        where: {
            email: email
        }
    });

    const contact2 = await prisma.contact.findFirst({
        where: {
            phoneNumber: phoneNumber
        }
    });

    // neither email nor phone number matched
    if (!contact1 && !contact2) {
        const contactId = await newPrimaryContact(email, phoneNumber);
        return contactId;
    }

    // only email matched
    if (!contact1 && contact2) {
        const linkedId = contact2.linkPrecedence == 'primary' ? contact2.id : contact2.linkedId;
        const contactEntry = await prisma.contact.create({
            data: {
                email: email,
                phoneNumber: phoneNumber,
                linkedId: linkedId,
                linkPrecedence: 'secondary'
            }
        })
        return contactEntry.linkedId;
    }

    // only phone number matched
    if (contact1 && !contact2) {
        const linkedId = contact1.linkPrecedence == 'primary' ? contact1.id : contact1.linkedId;
        const contactEntry = await prisma.contact.create({
            data: {
                email: email,
                phoneNumber: phoneNumber,
                linkedId: linkedId,
                linkPrecedence: 'secondary'
            }
        })
        return contactEntry.linkedId;
    }

    // email and phone number matched to 2 different existing contacts
    else {

        // both contact are primary
        if (contact1.linkPrecedence == 'primary' && contact2.linkPrecedence == 'primary') {
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
                        linkPrecedence: 'secondary'
                    },
                })
                const contactEntry = await prisma.contact.create({
                    data: {
                        email: email,
                        phoneNumber: phoneNumber,
                        linkedId: contact1.id,
                        linkPrecedence: 'secondary'
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
                        linkPrecedence: 'secondary'
                    },
                })
                const contactEntry = await prisma.contact.create({
                    data: {
                        email: email,
                        phoneNumber: phoneNumber,
                        linkedId: contact2.id,
                        linkPrecedence: 'secondary'
                    }
                })
                return contactEntry.linkedId;
            }
        }

        // both contacts are secondary
        else if (contact1.linkPrecedence == 'secondary' && contact2.linkPrecedence == 'secondary') {
            if (contact1.linkedId == contact2.linkedId){
                const contactEntry = await prisma.contact.create({
                    data: {
                        email: email,
                        phoneNumber: phoneNumber,
                        linkedId: contact1.linkedId,
                        linkPrecedence: 'secondary'
                    }
                })
                return contactEntry.linkedId;
            }
            const primaryContact1 = await prisma.contact.findFirst({
                where: {
                    id: contact1.linkedId
                }
            });
            const primaryContact2 = await prisma.contact.findFirst({
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
                        linkPrecedence: 'secondary'
                    },
                })
                const contactEntry = await prisma.contact.create({
                    data: {
                        email: email,
                        phoneNumber: phoneNumber,
                        linkedId: primaryContact1.id,
                        linkPrecedence: 'secondary'
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
                        linkPrecedence: 'secondary'
                    },
                })
                const contactEntry = await prisma.contact.create({
                    data: {
                        email: email,
                        phoneNumber: phoneNumber,
                        linkedId: primaryContact2.id,
                        linkPrecedence: 'secondary'
                    }
                })
                return contactEntry.linkedId;
            }
        }

        // one contact is primary and another secondary
        else {
            const primaryContact = contact1.linkPrecedence == 'primary' ? contact1 : contact2;
            const secondaryContact = contact1.linkPrecedence == 'secondary' ? contact1 : contact2;
            if (secondaryContact.linkedId == primaryContact.id) {
                const contactEntry = await prisma.contact.create({
                    data: {
                        email: email,
                        phoneNumber: phoneNumber,
                        linkedId: primaryContact.id,
                        linkPrecedence: 'secondary'
                    }
                });
                return contactEntry.linkedId;
            }
            else {
                const anotherPrimaryContact = await prisma.contact.findFirst({
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
                            linkPrecedence: 'secondary'
                        },
                    })
                    const contactEntry = await prisma.contact.create({
                        data: {
                            email: email,
                            phoneNumber: phoneNumber,
                            linkedId: anotherPrimaryContact.id,
                            linkPrecedence: 'secondary'
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
                            linkPrecedence: 'secondary'
                        },
                    })
                    const contactEntry = await prisma.contact.create({
                        data: {
                            email: email,
                            phoneNumber: phoneNumber,
                            linkedId: primaryContact.id,
                            linkPrecedence: 'secondary'
                        }
                    })
                    return contactEntry.linkedId;
                }
            }
        }
    }
};


//    @desc Identify contact
//    @route POST /identify
//    @access Public
export const identify = async (req: Request, res: Response) => {
    try {
        const { email, phoneNumber } = req.body;
        const contactId = await returnLinkedId(email, phoneNumber);
        const primaryContact = await prisma.contact.findUnique({
            where: {
                id: contactId
            }
        });
        const linkedContacts = await prisma.contact.findMany({
            where: {
                linkedId: contactId
            }
        });
        const emails: string[] = [primaryContact.email];
        const phoneNumbers: string[] = [primaryContact.phoneNumber];
        const secondaryContactIds: number[] = [];
        linkedContacts.forEach((contact: { email: string; phoneNumber: string; id: number }) => {
            emails.push(contact.email);
            phoneNumbers.push(contact.phoneNumber);
            secondaryContactIds.push(contact.id);
        });
        res.status(200).json({
            contact: {
                primaryContactId: contactId,
                emails: [...new Set(emails)],
                phoneNumbers: [...new Set(phoneNumbers)],
                secondaryContactIds: secondaryContactIds
            }
        })
    }
    catch (error) {
        const errorMessage = (error as Error).message;
        console.log(error);
        res.status(500).json({ message: errorMessage });
    }
}

/*
    Create a new primary contact because neither the email or phoneNumber exist in the database.
*/
const newPrimaryContact = async (email: String, phoneNumber: String) => {
    const contact = await prisma.contact.create({
        data: {
            email: email,
            phoneNumber: phoneNumber,
            linkPrecedence: 'primary'
        },
    });
    return contact.id;
}