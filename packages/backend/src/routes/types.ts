import { Type } from '@sinclair/typebox';
import { WithId } from 'mongodb';
import { ForRequest, MongoPayment } from '../types';
import { encrypt } from '../utils';
import { paymentStatuses } from '@keagate/common';

// function StringEnum<T extends string[]>(values: [...T], options?: UnsafeOptions) {
//     return Type.Unsafe<T[number]>({ enum: values, ...options });
// }

export const MongoTypeForRequest = Type.Object(
    {
        publicKey: Type.String({
            description: `The destination address of the payment wallet for the client to send their assets to. 
        This wallet is controlled programmatically and will automatically deposit to your admin wallet as defined in \`/config/local.json\`.
        For most currencies, this address is generated uniquely upon newly created payments, except for some currencies like XRP 
        where a custom memo must be sent by the payee to be identified.`,
        }),
        amount: Type.Number({
            description: `The total value of the payment as defined in \`createPayment\`. Note that this is not necessarily the exact amount required
        before a payment is marked as complete. This depends on the value of *TRANSACTION_SLIPPAGE_TOLERANCE* in \`/config/local.json\` which dictates the
        percentage of a payment that is discounted from the total payment to create a smoother transaction process with network fees.
        `,
        }),
        amountPaid: Type.Number({
            description: `The total value that has been confirmed as being paid by the payee.`,
        }),
        expiresAt: Type.String({
            description: `An ISO 8601 timestamp detailing when a payment expires at. This value is calculated as [current date + *TRANSACTION_TIMEOUT* (a millisecond value in \`/config/local.json\`)].`,
        }),
        createdAt: Type.String({
            description: `An ISO 8601 timestamp detailing when a payment was created.`,
        }),
        updatedAt: Type.String({
            description: `An ISO 8601 timestamp detailing when a payment last received a status update.`,
        }),
        status: Type.String({
            description: `The current status of a payment. Can be one of: ${JSON.stringify(paymentStatuses)}.`,
        }),
        id: Type.String({
            description: `The internal id of a payment, also serves as Mongo's _id for the given record.`,
        }),
        extraId: Type.Optional(
            Type.String({
                description: `An optional extraId as defined in \`createPayment\`. This is useful for you manually managing the identity of payment.
        Example: An e-commerce store assigns some identification parameter upon a user's checkout for internal use. They create a new payment (via \`/createPayment\`) with 
        this value in the *extraId* parameter. The e-commerce store now doesn't have to manage Keagate's assigned *id*, since this *extraId* will be passed in the ipnCallback
        and can be used to find payments via \`/getPaymentsByExtraId\`.`,
            }),
        ),
        ipnCallbackUrl: Type.Optional(
            Type.String({
                format: 'uri',
                description: `An optional callback URL that will be invoked from Keagate when the status of a payment is updated. The request made by Keagate will
        be a POST request with the body being a JSON object of this same schema.`,
            }),
        ),
        invoiceCallbackUrl: Type.Optional(
            Type.String({
                format: 'uri',
                description: `An optional URL that payees will be re-directed to when their payment finalizes within the invoice interface. A query string parameter will
        be appended called *status* with the status of the payment. This re-direction will occur automatically.`,
            }),
        ),
        payoutTransactionHash: Type.Optional(
            Type.String({
                description: `The transaction id of the successful payment from the generated wallet to your admin wallet of the same currency. This can be used in the corresponding block explorer of this payment's currency.`,
            }),
        ),
        invoiceUrl: Type.String({
            description: `The path of a Keagate invoice that can be optionally used by your payee's. This is easier to use than the API-driven workflow, but
        is not required. Note that this is only a path and must be appended to your public domain that Keagate is running on.`,
        }),
        currency: Type.String({
            description: `The shorthand name of the selected payment's corresponding currency.`,
        }),
        walletIndex: Type.Optional(
            Type.Number({
                description: `Can be ignored and is typically only used for debugging purposes.`,
            }),
        ),
        memo: Type.Optional(
            Type.String({
                description: `If this payment currency doesn't support randomly generated wallets for each payment (such as XRP). The payee must pass this value
        as the memo or description of their transaction.`,
            }),
        ),
    },
    {
        description: `Successful response`,
    },
);

export function cleanDetails(details: MongoPayment | WithId<Omit<MongoPayment, 'id'>>): ForRequest<MongoPayment> {
    const id = 'id' in details ? details.id : details._id.toString();

    return {
        publicKey: details.publicKey,
        amount: details.amount,
        expiresAt: typeof details.expiresAt === 'string' ? details.expiresAt : details.expiresAt.toISOString(),
        createdAt: typeof details.createdAt === 'string' ? details.createdAt : details.createdAt.toISOString(),
        updatedAt: typeof details.updatedAt === 'string' ? details.updatedAt : details.updatedAt.toISOString(),
        status: details.status,
        id,
        extraId: details.extraId,
        ipnCallbackUrl: details.ipnCallbackUrl,
        invoiceCallbackUrl: details.invoiceCallbackUrl,
        payoutTransactionHash: details.payoutTransactionHash,
        invoiceUrl: `/invoice/${details.currency}/${encrypt(id)}`,
        currency: details.currency,
        amountPaid: details.amountPaid,
        ...({
            walletIndex: 'walletIndex' in details ? details.walletIndex : undefined,
            memo: 'memo' in details ? details.memo : undefined,
        } as any),
    };
}

export const AdminRouteHeaders = Type.Object({
    'keagate-api-key': Type.String({
        description: `The api key that you have set in \`/config/local.json\`. Default is "API-KEY", but must be changed for production use.`,
    }),
});

export const ErrorResponse = Type.Object(
    {
        error: Type.Optional(
            Type.String({
                description: `Error message string`,
            }),
        ),
    },
    {
        description: `Error response with message.`,
    },
);
