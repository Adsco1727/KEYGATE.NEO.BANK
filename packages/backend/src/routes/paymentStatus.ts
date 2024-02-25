import { Static, Type } from '@sinclair/typebox';
import { FastifyInstance, RouteShorthandOptions } from 'fastify';
import auth from '../middlewares/auth';
import mongoGenerator from '../mongo/generator';
import { ObjectId, WithId } from 'mongodb';
import { MongoTypeForRequest, cleanDetails, AdminRouteHeaders, ErrorResponse } from './types';
import { decrypt } from '../utils';

const PaymentStatusQueryString = Type.Object({
    id: Type.String({
        description: `The database id or invoice id of an existing payment`,
    }),
});

const opts: RouteShorthandOptions = {
    schema: {
        response: {
            300: ErrorResponse,
            200: MongoTypeForRequest,
        },
        querystring: PaymentStatusQueryString,
        headers: AdminRouteHeaders,
        tags: ['Payment'],
        description: 'Retrieve the status and associated data of a payment.',
        summary: 'Retrieve the status and associated data of a payment',
        security: [
            {
                ApiKey: [],
            },
        ],
    },
    preHandler: auth,
};

export default async function createPaymentStatusRoute(server: FastifyInstance) {
    server.get<{
        Reply: Static<typeof MongoTypeForRequest> | Static<typeof ErrorResponse>;
        Querystring: Static<typeof PaymentStatusQueryString>;
    }>('/getPaymentStatus', opts, async (request, reply) => {
        const providedId = request.query.id;
        const databaseId = providedId.length === 64 ? decrypt(providedId) : providedId;
        const { db } = await mongoGenerator();
        const selectedPayment = (await db.collection('payments').findOne({ _id: new ObjectId(databaseId) })) as WithId<Record<string, any>> | null;
        if (!selectedPayment) {
            return reply.status(300).send({ error: 'No payment found with given database id or invoice id' });
        }
        reply.status(200).send(cleanDetails(selectedPayment as any));
    });
}
