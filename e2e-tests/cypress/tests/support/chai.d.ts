declare namespace Cypress {
    interface Chainer<Subject> {
        (chainer: 'be.focusVisible', {exactStyles}: {exactStyles?: boolean}): Chainable<Subject>;
        (chainer: 'not.be.focusVisible', {exactStyles}: {exactStyles?: boolean}): Chainable<Subject>;
    }
}