import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import './about.css'

const About = () => {
    return (
        <Container className="my-5">
            <Row>
                <Col>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: .5 }}
                    >
                        <section id="hero" className='profile-container'>
                            <div className='info'>
                                <h3 className='about-heading'>What is JSON Playground?</h3>
                                <p className='description'>
                                    JSON, which stands for "JavaScript Object Notation," is a human-readable and compact format used to represent complex data structures and facilitate data interchange between systems. Due to its simplicity and readability, JSON is widely adopted across various applications and industries for data communication.<br /><br />

                                    JSON Playground is an all-in-one developer workspace to format, compare, execute, and collaborate on code and data. It features real-time JSON parsing and tree inspection, side-by-side diff comparison, collaborative multi-user rooms, and an integrated multi-language code compiler (JavaScript, TypeScript, Python, Java, C, C++, Go) with instant LeetCode/interview testing and JSON pipeline integration.
                                </p>
                            </div>
                            <div className='info'>
                                <h3 className='about-heading'>What is JSON?</h3>
                                <p className='description'>
                                    There are several reasons why you should consider using JSON, the key reason being that JSON is independent of your system's programming language, despite being derived from JavaScript. Not only is JSON language-independent, but it also represents data that speaks common elements of many programming languages, effectively making it into a universal data representation understood by all systems.<br />
                                    Other reasons include:
                                    <ul className='list'>
                                        <li>Readability - JSON is human-readable, given proper formatting.</li>
                                        <li>Compactness - JSON data format doesn't use a complete markup structure, unlike XML.</li>
                                        <li>It's easy to analyze into logical syntactic components, especially in JavaScript.</li>
                                        <li>Countless JSON libraries are available for most programming languages. </li>
                                    </ul>
                                </p>
                            </div>
                        </section>
                        {/* <section id="footer" className='footer-container'>
                            <p className='footer'>
                                &copy; 2024 Gaurav Singh. <br />
                                All rights reserved.
                            </p>
                        </section> */}
                    </motion.div>
                </Col>
            </Row>
        </Container>
    );
};

export default About;
